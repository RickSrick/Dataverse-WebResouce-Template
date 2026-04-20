import type { RsbuildPlugin } from '@rsbuild/core';
import { v5 as uuidv5 } from "uuid";
import AdmZip from 'adm-zip';
import fs from 'node:fs';
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
export type SolutionCreatorOptions = {
    prefix: string;
    solutionName: string
    resourceName?: string
    publisherName: string,
    publisherDisplay: string,
    version: string
};
type WebResourceToUpload = {
    filePath: string,
    resType: number,
    logicalName: string,
    displayName: string,
    guid: string,
    sanitizeFile: string
}
// https://learn.microsoft.com/en-us/power-apps/developer/model-driven-apps/web-resources
const ResourceTypes: Record<string, [number, string]> = {
    ".html": [1, "\x1B[38;5;41m"],
    ".htm":  [1, "\x1B[38;5;41m"],
    ".css":  [2, "\x1B[38;5;185m"],
    ".js":   [3, "\x1B[38;5;38m"],
    ".xml":  [4, "\x1B[38;5;10m"],
    ".png":  [5, "\x1B[38;5;218m"],
    ".jpg":  [6, "\x1B[38;5;219m"],
    ".gif":  [7, "\x1B[38;5;217m"],
    ".xap":  [8, "\x1B[38;5;100m"],
    ".xsl":  [9, "\x1B[38;5;340m"],
    ".xslt": [9, "\x1B[38;5;340m"],
    ".ico":  [10, "\x1B[38;5;215m"],
    ".svg":  [11, "\x1B[38;5;214m"],
    ".resx": [12, "\x1B[38;5;250m"]
}

export const SolutionCreator = (options: SolutionCreatorOptions): RsbuildPlugin => ({
    name: 'solution-creator',
    setup(api) {
        let containsflag: boolean = false;

        api.onBeforeBuild(() => {
            containsflag = process.argv.includes('--create-sol');
        });

        api.onAfterBuild(() => {
            if (!containsflag) { return; }
            const config = api.getNormalizedConfig();
            const distRoot = config.output.distPath.root;
            BuildZipFileDirectly(distRoot, options);
        });
    },
});
const BuildZipFileDirectly = (dirPath: string, options: SolutionCreatorOptions): void => {
    const zip: AdmZip = new AdmZip();
    zip.addFile("[Content_Types].xml", Buffer.from(contentXml, "utf8"));

    const files: WebResourceToUpload[] = fs.readdirSync(dirPath, { recursive: true, withFileTypes: true })
        .reduce((result: WebResourceToUpload[], file: fs.Dirent): WebResourceToUpload[] => {
            const resType = ResourceTypes[path.extname(file.name)];
            if (!file.isDirectory() && resType !== null && resType !== undefined) {
                const strpath: string = file.parentPath.replace(/[\\]/g, "/") + "/" + file.name;
                const strlogical: string = options.prefix + "_" + options.resourceName + strpath.replace(dirPath, "")
                result.push({
                    filePath: strpath,
                    resType: ResourceTypes[path.extname(file.name)][0],
                    logicalName: strlogical,
                    displayName: strlogical,
                    guid: uuidv5(strlogical, MY_NAMESPACE),
                    sanitizeFile: "WebResource_" + strlogical.replace(/[\\/*?:"<>|]/g, '')
                })
            }
            return result;
        }, []);

    zip.addFile("solution.xml", Buffer.from(buildSolutionXml(files, options)));
    zip.addFile("customizations.xml", Buffer.from(buildCustomizationXml(files)));

    files.forEach((file: WebResourceToUpload) => {
        zip.addFile("WebResources/" + file.sanitizeFile, Buffer.from(fs.readFileSync(file.filePath, 'utf8'), "utf8"));
    });
    zip.writeZip(options.solutionName + ".zip");
    logExport(files, options);
}
function logExport(files: WebResourceToUpload[], options: SolutionCreatorOptions) {
    console.log("\nSolution \x1B[1;36m" + options.solutionName + ".zip\x1B[0m created!\n")
    const tabsize = 3;
    let longestPath = 0;

    files.forEach((file) => { if (file.filePath.length > longestPath) longestPath = file.filePath.length; })
    longestPath += tabsize;

    console.log("\x1B[34mFile (web)" + " ".repeat(longestPath - "File (web)".length) + "Logical Name\x1B[0m");
    files.forEach(file => {
        const color = ResourceTypes[path.extname(file.filePath)][1];
        const filepathdivided = file.filePath.split("/");
        console.log("\x1B[38;5;239m" + filepathdivided.splice(0, filepathdivided.length - 1).join("/") + "/" + color + filepathdivided[filepathdivided.length - 1] + "\x1B[0m" + " ".repeat(longestPath - file.filePath.length) + file.logicalName);
    });
}


function buildSolutionXml(files: WebResourceToUpload[], options: SolutionCreatorOptions): string {
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
function buildCustomizationXml(files: WebResourceToUpload[]): string {
    return `<ImportExportXml xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><WebResources>
${files.map((file: WebResourceToUpload) => {
        return `<WebResource>
<WebResourceId>{${file.guid}}</WebResourceId>
<Name>${file.logicalName}</Name>
<DisplayName>${file.displayName}</DisplayName>
<WebResourceType>${file.resType}</WebResourceType>
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