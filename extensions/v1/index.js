'use strict'

const Vinyl = require('vinyl');
const path = require('path');
const MenuBuilder = require('./builder');


class DynaMenuExtension {

    static register({config}) {
        return new DynaMenuExtension(this, config)
    }

    logger;
    builder;
    partialName;

    // https://docs.antora.org/antora/latest/extend/generator-events-reference/
    constructor(context, config) {
        ;(this.antoraContext) = context
            .on('contentAggregated', this.contentAggregated.bind(this))
            .on('navigationBuilt', this.navigationBuilt.bind(this));
        this.logger = this.antoraContext.getLogger('menu-extension');
        this.builder = new MenuBuilder(config, this.logger);
        this.partialName = config.hsb?.menuPartial ? config.hbs?.menuPartial : 'main-menu';
    }

    contentAggregated({playbook, siteCatalog, contentAggregate}) {
        this.builder.resolveMenuDefinition(contentAggregate);
    }

    navigationBuilt({playbook, siteAsciiDocConfig, siteCatalog, uiCatalog, contentCatalog, navigationCatalog}) {
        let htmlPartialContent = this.builder.build(contentCatalog);
        let menuFile = this.registerMainMenuContent(htmlPartialContent);
        this.logger.debug(`derived menu template: 
============
${htmlPartialContent}
============
`);
        uiCatalog.addFile(menuFile);
    }

    registerMainMenuContent(htmlPartialContent) {
        return this.vinyl({
            path: `${this.partialName}.hbs`,
            type: 'partial',
            content: `
<!--- start: injected from menu extension --->
${htmlPartialContent}
<!--- end: injected from menu extension --->
`,
            stem: this.partialName,
            extname: '.hbs',
        });
    }

    vinyl(file) {
        return new Vinyl({
            cwd: "/",
            type: file.type,
            path: file.path,
            contents: Buffer.from(file.content),
            src: {
                abspath: path.resolve(file.path),
                path: file.path,
                stem: file.stem,
                extname: file.extname
            }
        })
    }

}

module.exports = DynaMenuExtension
