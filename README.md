# Basic Template for Dataverse WebResources
This project uses rsbuild (since `create-react-app` is deprecated) to create a React WebResource with FluentUI integrated. This solution provides a fast and efficient way to create and edit web apps.

## Prerequisites
It is recommended that you have the LTS version (currently 24.14.0) of Node.js. 

### For Windows
We recommend installing the [Node version manager](https://github.com/coreybutler/nvm-windows?tab=readme-ov-file) by following the guide.Once nvm is installed and your PC has restarted, open a terminal and type
```bash
nvm install 24.14.0
```
Once the installation is complete, if it was successful, type:
```bash
nvm use 24.14.0
```
to set this as the current version of Node installed on your computer.

## Configuration
The first step is to install the dependencies (listed in the package-lock.json file). The project contains the minimum number of packages required for a React project with FuentUI v9.
```bash
npm install
````
After downloading all dependencies, we can start our project on a server [http://localhost:3000](http://localhost:3000), using the command: 
```bash
npm run dev
```
Once development is complete, we can build the project using:
```bash
npm run build
```
## Build
The compiled project will have a structure similar to this:
```
build/
├── css/
│   └── index.css
├── js/
│   └── index.js
└── index.html
```
Now let’s proceed to upload the files into Power Apps. You will need to create 3 web resources:
- {prefix}_{webResourceName}/index.html
- {prefix}_{webResourceName}/css/index.css
- {prefix}_{webResourceName}/js/index.js

It is important to maintain this naming convention to ensure that the JS and CSS files are automatically linked. (If needed, you can freely modify the index.html file as you prefer)

## Export
I have developed a small, straightforward plugin that generates a solution ZIP file ready to be uploaded to Dataverse.
To use it, simply run:	
```bash
npm run export
```
The plugin's source code is located in `SolutionCreator.ts`, and you can customize its settings in `rsbuild.config.ts`.


## User Notes
Inside the index.html file, there is a link with an href to `"../ClientGlobalContext.js.aspx"`. This file will allow
you to have the Xrm object within the window of your web resource. 
The Xrm object **DOES NOT CONTAIN** the formContext.

### How do I pass the formContext to the web resource?
The only way I know of is to write code similar to the Form's onLoad event:
```js
addFormContextToWebResource : async function (executionContext) {
    const formContext = executionContext.getFormContext();
    window._formContext = formContext;
}
```
This way, _formContext will be available within the web resource by calling window.parent._formContext.

## Useful Links
Here are some useful links to help with development:
- [Rsbuild documentation](https://rsbuild.rs) - Explore Rsbuild's features.
- [FluentUI v9](https://storybooks.fluentui.dev/react/?path=/docs/concepts-introduction--docs) - Microsoft's UI library
- [React](https://react.dev/learn/describing-the-ui)