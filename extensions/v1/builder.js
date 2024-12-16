'use strict'
const yaml = require('js-yaml');
const {Document, Group, MenuContent} = require('./menuStructure');

class MenuBuilder {
    componentName;
    configFile;
    logger;
    menu;

    constructor(config, logger) {
        this.logger = logger;
        // create menu from config or fallback
        if (config.component && config.file) {
            this.componentName = config.component;
            this.configFile = config.file;
            this.logger.info(`menu source: '${this.componentName}/${this.configFile}'`);
        } else if (config.menu) {
            this.menu = config.menu;
            this.logger.info(`menu source: playbook extension config inline`);
        } else {
            this.logger.info(`menu source: fallback`);
            this.menu =
                [
                    {
                        "title": "Products",
                        "entries": [{"link": "#", "title": "Product A"}, {
                            "title": "Product Sub1",
                            "entries": [{"link": "#", "title": "Product B"}]
                        }]
                    },
                    {
                        "title": "Services",
                        "entries": [{"link": "#", "title": "Service A"}, {"link": "#", "title": "Service B"}]
                    },
                ];
        }
        this.hbs = {
            groupStart: config.hbs?.groupStart ? config.hbs.groupStart : "main-menu-group-start",
            groupEnd: config.hbs?.groupEnd ? config.hbs.groupEnd : "main-menu-group-end",
            docRef: config.hbs?.docRef ? config.hbs.docRef : "main-menu-docref",
        };
    }

    resolveMenuDefinition(modules) {
        if (this.componentName && this.configFile) {
            let configModule = modules.find(module => module.name === this.componentName);
            if (configModule === undefined) {
                throw new Error(`specified menu component ${this.componentName} not found`);
            }
            let menuConfigFile = configModule.files.find(file => file.src.path === this.configFile);
            if (menuConfigFile === undefined) {
                throw new Error(`specified menu file ${this.configFile} not found in component ${this.componentName}`);
            }
            this.menu = yaml.load(menuConfigFile.contents.toString());
            this.logger.info(`menu setup is loaded from module/file '${this.componentName}/${this.configFile}'`);
        } else {
            this.logger.info(`menu setup is defined via playbook extension config options`);
        }
    }

    build(contentCatalog) {
        // resolved menu template
        let mainMenuContent = new MenuContent(this.hbs.groupStart, this.hbs.groupEnd, this.hbs.docRef);
        this.menu.forEach(entry => {
            if (entry.title) {
                mainMenuContent.add(this.inspectGroupEntry(undefined, entry, contentCatalog));
            } else {
                throw new Error(`root element must have a title and optional entries ${this.toString(entry)}`);
            }
        })
        return mainMenuContent.toPartialHandlebar();
    }

    toString(entry) {
        var s = `${entry.toString()} {`;
        Object.getOwnPropertyNames(entry).forEach(key => {
            s += `${key}=${entry[key]}, `
        });
        return `${s} }`;
    }

    inspectGroupEntry(parentNode, entry, contentCatalog) {
        let groupNode = new Group(entry.title);
        parentNode?.add(groupNode);
        entry.entries?.forEach((subEntry) => {
            if (subEntry.module) {
                let component = contentCatalog.getComponent(subEntry.module);
                groupNode.add(component
                    ? Document.resolved(component.latest.title, component.latest.url, component.name)
                    : Document.unresolved(entry.module));
            } else if (subEntry.link) {
                groupNode.add(Document.external(subEntry.title, subEntry.link));
            } else if (subEntry.title) {
                this.inspectGroupEntry(groupNode, subEntry, contentCatalog);
            }
        })
        return groupNode;
    }
}


module.exports = MenuBuilder;
