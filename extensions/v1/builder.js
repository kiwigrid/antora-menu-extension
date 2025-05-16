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
            const configModule = modules.find(module => module.name === this.componentName);
            if (configModule === undefined) {
                throw new Error(`specified menu component ${this.componentName} not found`);
            }
            const menuConfigFile = configModule.files.find(file => file.src.path === this.configFile);
            if (menuConfigFile === undefined) {
                throw new Error(`specified menu file ${this.configFile} not found in component ${this.componentName}`);
            }
            this.menu = yaml.load(menuConfigFile.contents.toString());
            this.logger.info(`menu setup is loaded from module/file '${this.componentName}/${this.configFile}'`);
        } else {
            this.logger.info(`menu setup is defined via playbook extension config options`);
        }
    }

    identifyOrphanedComponents(contentCatalog) {
        const components = contentCatalog.getComponents().map(component => component.name);
        this.menu.forEach(menuEntry => {
            this.reduceComponents(menuEntry, module => {
                const idx = components.indexOf(module);
                if (idx > -1) {
                    components.splice(idx, 1);
                }
            });
        });
        return components;
    }

    reduceComponents(menuEntry, fnHandler) {
        if(menuEntry.module) {
            fnHandler(menuEntry.module);
        } else if(menuEntry.entries) {
            menuEntry.entries.forEach(entry => this.reduceComponents(entry, fnHandler))
        }
    }

    build(contentCatalog) {
        // resolved menu template
        const mainMenuContent = new MenuContent(this.hbs.groupStart, this.hbs.groupEnd, this.hbs.docRef);
        this.menu.forEach(entry => { mainMenuContent.add(this.inspectEntry(entry, contentCatalog)) })
        return mainMenuContent.toPartialHandlebar();
    }

    toString(entry) {
        const values = Object.getOwnPropertyNames(entry)
            .map((key) => `${key}=${entry[key]}`)
            .join(",");
        return `${entry.toString()} { ${values} }`;
    }

    inspectEntry(entry, contentCatalog) {
        if(entry.link) {
            // external link
            return Document.external(entry.title, entry.link);
        } else if(entry.module) {
            // module reference
            const component = contentCatalog.getComponent(entry.module);
            if(component && entry.page ) {
                let pages = contentCatalog.getPages(p => {
                    return p.src.path === entry.page;
                });
                let page = pages.find(()  => true);
                return page
                    ? Document.resolvedPage(entry.title ? entry.title : page.asciidoc.doctitle, page.pub.url, component.name)
                    : Document.unresolvedPage(`${component.latest.title} (${entry.page})`, component.latest.url, component.name);
            }
            return component
                ? Document.resolved(entry.title ? entry.title : component.latest.title, component.latest.url, component.name)
                : Document.unresolved(entry.module);
        } else if(entry.title) {
            // group
            const groupNode = new Group(entry.title);
            entry.entries?.forEach((subEntry) => {
                groupNode.add(this.inspectEntry(subEntry, contentCatalog));
            });
            return groupNode;
        } else {
            // unspecified
            throw new Error(`bad entry format. Couldn't identify one of [group, module reference or external link]. Entry: ${this.toString(entry)}`)
        }
    }

}


module.exports = MenuBuilder;
