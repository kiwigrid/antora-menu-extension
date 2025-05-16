'use strict'

class Entry {
    title;

    constructor(title) {
        if (new.target === Entry) {
            throw new TypeError("Cannot construct Entry instances directly");
        }
        this.title = title;
    }
}

class Group extends Entry {
    groups;

    constructor(title) {
        super(title);
        this.groups = [];
    }

    toString() {
        return `Group(${this.title}, ${this.groups.length})`;
    }

    add(entry) {
        this.groups.push(entry);
    }
}

class Document extends Entry {
    ref;
    resolved;
    page;
    external;
    component;

    static external(title, ref) {
        return new Document(title, ref, true, true, false, null);
    }

    static resolved(title, ref, component) {
        return new Document(title, ref, true, false, false, component);
    }

    static resolvedPage(title, ref, component) {
        return new Document(title, ref, true, false, true, component);
    }

    static unresolvedPage(title, ref, component) {
        return new Document(title, ref, false, false, true, component);
    }

    static unresolved(name) {
        return new Document(name, "#", false, false, false, null);
    }

    constructor(title, ref, resolved = true, external = false, page = false, component = null) {
        super(title);
        this.ref = ref;
        this.resolved = resolved;
        this.external = external;
        this.page = page;
        this.component = component;
    }

    toString() {
        return `Document(${this.title}${this.external ? " ,external" : ""}${this.resolved ? ", resolved" : ""}${this.page ? ", page" : ""},${this.ref})`
    }
}

class MenuContent {
    groups;
    hbsGroupStart;
    hbsGroupEnd;
    hbsDocRef;

    constructor(hbsGroupStart, hbsGroupEnd, hbsDocRef) {
        this.hbsGroupStart = hbsGroupStart;
        this.hbsGroupEnd = hbsGroupEnd;
        this.hbsDocRef = hbsDocRef;
        this.groups = [];
    }

    add(group) {
        this.groups.push(group);
    }

    toPartialHandlebar() {
        return this.groups
            .map(
                function(entry) {
                    if (entry instanceof Group) return this.mapGroup(entry, 0);
                    if (entry instanceof Document) return this.link(entry);
                }, this
            )
            .join("\n");
    }

    startGroup(title, level) {
        return `{{> ${this.hbsGroupStart} level=${level} group_title="${title}"}}`;
    }

    endGroup() {
        return `{{> ${this.hbsGroupEnd}}}`;
    }

    link(entry) {
        return `{{> ${this.hbsDocRef} resolved=${entry.resolved} doc_title="${entry.title}" ref="${entry.ref}" external=${entry.external} component="${entry.component}" page=${entry.page} }}`;
    }

    indent(level) {
        return "\t".repeat(level);
    }

    mapGroup(entry, level) {
        const content = entry.groups
            .map(nested => nested.groups ? this.mapGroup(nested, level+1) : this.link(nested) )
            .map(s => this.indent(level + 1) + s)
            .join('\n');
        return `${this.startGroup(entry.title, level)}
${content}
${this.indent(level)}${this.endGroup()}`;
    }

}

module.exports = {Document, Group, MenuContent};
