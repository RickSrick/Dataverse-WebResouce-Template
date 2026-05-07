import { readdir, readFile } from 'node:fs/promises';
import type { RsbuildPlugin } from '@rsbuild/core';
import { type Dirent } from 'node:fs';
import { v5 as uuidv5 } from "uuid";
import AdmZip from 'adm-zip';
import path from 'path';

/**
  * @author RickSrick
  * @abstract: This is a straightforward approach to building a solution. 
  *            I initially created a sample solution directly in Dataverse 
  *            and exported it. Based on that, I developed this script to 
  *            replicate the XML files and folder structure required to generate 
  *            a new solution. As you can see, the code simply manipulates
  *            strings to assemble the solution's ZIP file. It relies on two
  *            main libraries:
  *                 - uuid: to generate GUIDs for the web resources.
  *                 - adm-zip: to create the final solution ZIP file.
  */

const MY_NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";
const TAB_SIZE = 3;

export type SolutionCreatorOptions = {
    prefix: string;
    solutionName: string
    resourceName: string
    publisherName: string,
    publisherDisplay: string,
    version: string
};
type WebResourceToUpload = {
    filePath: string,
    resType: ResourceType,
    logicalName: string,
    displayName: string,
    guid: string,
    sanitizeFile: string
}
type ResourceType = { typeid: number, color: string }
// https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/web-resources
const ResourceTypes: Record<string, ResourceType> = {
    ".html": { typeid: 1, color: "\x1B[38;5;41m" },
    ".htm": { typeid: 1, color: "\x1B[38;5;41m" },
    ".css": { typeid: 2, color: "\x1B[38;5;185m" },
    ".js": { typeid: 3, color: "\x1B[38;5;38m" },
    ".xml": { typeid: 4, color: "\x1B[38;5;10m" },
    ".png": { typeid: 5, color: "\x1B[38;5;218m" },
    ".jpg": { typeid: 6, color: "\x1B[38;5;219m" },
    ".gif": { typeid: 7, color: "\x1B[38;5;217m" },
    ".xap": { typeid: 8, color: "\x1B[38;5;100m" },
    ".xsl": { typeid: 9, color: "\x1B[38;5;240m" },
    ".xslt": { typeid: 9, color: "\x1B[38;5;240m" },
    ".ico": { typeid: 10, color: "\x1B[38;5;215m" },
    ".svg": { typeid: 11, color: "\x1B[38;5;214m" },
    ".resx": { typeid: 12, color: "\x1B[38;5;250m" }
}

export const SolutionCreator = (options: SolutionCreatorOptions): RsbuildPlugin => ({
    name: 'solution-creator',
    setup(api) {
        let containsFlag: boolean = false;

        api.onBeforeBuild(() => {
            containsFlag = process.argv.includes('--create-sol');
        });
        api.onAfterBuild(async () => {
            if (!containsFlag) { return; }
            sanitizeOptions(options);
            const config = api.getNormalizedConfig();
            const distRoot = config.output.distPath.root;
            await buildZipFileDirectly(distRoot, options);
        });
    },
});
const buildZipFileDirectly = async (dirPath: string, options: SolutionCreatorOptions): Promise<void> => {
    try {
        const startTime = performance.now();
        const zip = new AdmZip();
        const entries = await readdir(dirPath, { recursive: true, withFileTypes: true });
        const files: WebResourceToUpload[] = entries
            .reduce((result: WebResourceToUpload[], file: Dirent): WebResourceToUpload[] => {
                const resType = ResourceTypes[path.extname(file.name)];
                if (!file.isDirectory() && resType !== null && resType !== undefined) {
                    const strpath: string = file.parentPath.replace(/[\\]/g, "/") + "/" + file.name;
                    const strlogical: string = options.prefix + "_" + options.resourceName + strpath.replace(dirPath, "");
                    result.push({
                        filePath: strpath,
                        resType: ResourceTypes[path.extname(file.name)],
                        logicalName: strlogical,
                        displayName: strlogical,
                        guid: uuidv5(strlogical, MY_NAMESPACE),
                        sanitizeFile: "WebResource_" + strlogical.replace(/[\\/*?:"<>|]/g, '')
                    })
                }
                return result;
            }, []);

        if (files.length === 0) {
            console.warn("There are no file for a solution");
            return;
        }

        zip.addFile("[Content_Types].xml", Buffer.from(contentXml, "utf8"));
        zip.addFile("solution.xml", Buffer.from(buildSolutionXml(files, options)));
        zip.addFile("customizations.xml", Buffer.from(buildCustomizationXml(files)));
        const fileContents = await Promise.all(
            files.map(async (file) => ({
                path: "WebResources/" + file.sanitizeFile,
                content : await readFile(file.filePath)
            }))
        );
        fileContents.forEach(({ path, content }) => {
            zip.addFile(path, content);
        });

        zip.writeZip(options.solutionName + ".zip");
        const endTime = performance.now();
        logExport(files, options, (endTime - startTime));
    }
    catch (error: unknown) {
        if (!(error instanceof Error)) return;
        console.error("Error during build: " + error.message);
    }
}
const sanitizeOptions = (options: SolutionCreatorOptions): void => {
    if (!options.prefix.match(/^(?!mscrm)[a-zA-Z][a-zA-Z0-9]{1,7}$/)) {
        throw new Error("The prefix must be between 2 and 8 characters long, may consist only of alphanumeric characters, must begin with a letter, and cannot begin with “mscrm”.");
    }
    options.publisherDisplay = sanitizeString(options.publisherDisplay);
    options.publisherName = sanitizeString(options.publisherName);
    options.resourceName = sanitizeString(options.resourceName);
    options.solutionName = sanitizeString(options.solutionName);

    if (!options.version.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        throw new Error("The version must be in the format x.x.x.x")
    }
}
const sanitizeString = (input: string): string => {
    let sanitized = input;
    sanitized = sanitized.replace(/&/g, "&amp;");
    sanitized = sanitized.replace(/</g, "&lt;");
    sanitized = sanitized.replace(/>/g, "&gt;");
    sanitized = sanitized.replace(/\"/g, "&quot;");
    sanitized = sanitized.replace(/'/g, "&apos;");
    return sanitized;
}
const logExport = (files: WebResourceToUpload[], options: SolutionCreatorOptions, executionms: number): void => {

    console.log(`\nSolution \x1B[1;36m${options.solutionName}.zip\x1B[0m created! (in: ${(executionms / 1000).toFixed(2)} s)\n`);
    let longestPath = 0;
    files.forEach((file) => { if (file.filePath.length > longestPath) longestPath = file.filePath.length; })
    longestPath += TAB_SIZE;

    console.log(`\x1B[34mFile (web)${" ".repeat(longestPath - "File (web)".length)}Logical Name\x1B[0m`);
    files.forEach(file => {
        const filepathdivided = file.filePath.split("/");
        console.log(`\x1B[38;5;239m${filepathdivided.splice(0, filepathdivided.length - 1).join("/")}/${file.resType.color}${filepathdivided[filepathdivided.length - 1]}\x1B[0m${" ".repeat(longestPath - file.filePath.length)}${file.logicalName}`);
    });
}


const buildSolutionXml = (files: WebResourceToUpload[], options: SolutionCreatorOptions): string => {
    return `<ImportExportXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" version="9.2.24041.198" SolutionPackageVersion="9.2" languagecode="1033" generatedBy="RickBuilder">
<SolutionManifest>
<UniqueName>${options.solutionName}</UniqueName>
<LocalizedNames>
<LocalizedName description="${options.solutionName}" languagecode="1033"/>
</LocalizedNames>
<Descriptions/>
<Version>${options.version}</Version>
<Managed>0</Managed>
<Publisher>
<UniqueName>${options.publisherName}</UniqueName>
<LocalizedNames>
<LocalizedName description="${options.publisherDisplay}" languagecode="1033"/>
</LocalizedNames>
<Descriptions/>
<EMailAddress xsi:nil="true"/>
<SupportingWebsiteUrl xsi:nil="true"/>
<CustomizationPrefix>${options.prefix}</CustomizationPrefix>
<CustomizationOptionValuePrefix>54595</CustomizationOptionValuePrefix>
<Addresses>
<Address>
<AddressNumber>1</AddressNumber>
<AddressTypeCode>1</AddressTypeCode>
<City xsi:nil="true"/>
<County xsi:nil="true"/>
<Country xsi:nil="true"/>
<Fax xsi:nil="true"/>
<FreightTermsCode xsi:nil="true"/>
<ImportSequenceNumber xsi:nil="true"/>
<Latitude xsi:nil="true"/>
<Line1 xsi:nil="true"/>
<Line2 xsi:nil="true"/>
<Line3 xsi:nil="true"/>
<Longitude xsi:nil="true"/>
<Name xsi:nil="true"/>
<PostalCode xsi:nil="true"/>
<PostOfficeBox xsi:nil="true"/>
<PrimaryContactName xsi:nil="true"/>
<ShippingMethodCode>1</ShippingMethodCode>
<StateOrProvince xsi:nil="true"/>
<Telephone1 xsi:nil="true"/>
<Telephone2 xsi:nil="true"/>
<Telephone3 xsi:nil="true"/>
<TimeZoneRuleVersionNumber>0</TimeZoneRuleVersionNumber>
<UPSZone xsi:nil="true"/>
<UTCOffset xsi:nil="true"/>
<UTCConversionTimeZoneCode xsi:nil="true"/>
</Address>
<Address>
<AddressNumber>2</AddressNumber>
<AddressTypeCode>1</AddressTypeCode>
<City xsi:nil="true"/>
<County xsi:nil="true"/>
<Country xsi:nil="true"/>
<Fax xsi:nil="true"/>
<FreightTermsCode xsi:nil="true"/>
<ImportSequenceNumber xsi:nil="true"/>
<Latitude xsi:nil="true"/>
<Line1 xsi:nil="true"/>
<Line2 xsi:nil="true"/>
<Line3 xsi:nil="true"/>
<Longitude xsi:nil="true"/>
<Name xsi:nil="true"/>
<PostalCode xsi:nil="true"/>
<PostOfficeBox xsi:nil="true"/>
<PrimaryContactName xsi:nil="true"/>
<ShippingMethodCode>1</ShippingMethodCode>
<StateOrProvince xsi:nil="true"/>
<Telephone1 xsi:nil="true"/>
<Telephone2 xsi:nil="true"/>
<Telephone3 xsi:nil="true"/>
<TimeZoneRuleVersionNumber>0</TimeZoneRuleVersionNumber>
<UPSZone xsi:nil="true"/>
<UTCOffset xsi:nil="true"/>
<UTCConversionTimeZoneCode xsi:nil="true"/>
</Address>
</Addresses>
</Publisher>
<RootComponents> ${files.map((file: WebResourceToUpload): string => {
        return '<RootComponent type="61" id="{' + file.guid + '}" schemaName="' + file.logicalName + '" behavior="0"/>'
    }).join("\n")
        }</RootComponents><MissingDependencies/></SolutionManifest></ImportExportXml>`
}
const buildCustomizationXml = (files: WebResourceToUpload[]): string => {
    return `<ImportExportXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><WebResources>
${files.map((file: WebResourceToUpload) => {
        return `<WebResource>
<WebResourceId>{${file.guid}}</WebResourceId>
<Name>${file.logicalName}</Name>
<DisplayName>${file.displayName}</DisplayName>
<WebResourceType>${file.resType.typeid}</WebResourceType>
<IsEnabledForMobileClient>0</IsEnabledForMobileClient>
<IsAvailableForMobileOffline>0</IsAvailableForMobileOffline>
<IsCustomizable>1</IsCustomizable>
<CanBeDeleted>1</CanBeDeleted>
<IsHidden>0</IsHidden>
<FileName>/WebResources/${file.sanitizeFile}</FileName>
</WebResource>`;
    }).join("\n")}
</WebResources>
<Languages/>
</ImportExportXml>`;
}
const contentXml = `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="htm" ContentType="text/html"/>
<Default Extension="html" ContentType="text/html"/>
<Default Extension="css" ContentType="text/css"/>
<Default Extension="js" ContentType="application/javascript"/>
<Default Extension="png" ContentType="image/png"/>
<Default Extension="jpg" ContentType="image/jpeg"/>
<Default Extension="jpeg" ContentType="image/jpeg"/>
<Default Extension="gif" ContentType="image/gif"/>
<Default Extension="ico" ContentType="image/x-icon"/>
<Default Extension="svg" ContentType="image/svg+xml"/>
<Default Extension="xap" ContentType="application/x-silverlight-app"/>
<Default Extension="xsl" ContentType="text/xsl"/>
<Default Extension="xslt" ContentType="text/xsl"/>
<Default Extension="resx" ContentType="application/xml"/>
</Types>`;