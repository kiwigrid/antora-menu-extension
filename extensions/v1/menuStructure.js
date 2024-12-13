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
    external;

    static external(title, ref) {
        return new Document(title, ref, true, true);
    }

    static resolved(title, ref) {
        return new Document(title, ref, true, false);
    }

    static unresolved(name) {
        return new Document(name, "#", false, false);
    }

    constructor(title, ref, resolved = true, external = false) {
        super(title);
        this.ref = ref;
        this.resolved = resolved;
        this.external = external;
    }

    toString() {
        return `Document(${this.title}${this.external ? " ,external" : ""}${this.resolved ? ", resolved" : ""},${this.ref})`
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
            .map(entry => this.mapGroup(entry, 0))
            .join("\n");
    }

    startGroup(title, level) {
        return `{{> ${this.hbsGroupStart} level=${level} group_title="${title}"}}`;
    }

    endGroup() {
        return `{{> ${this.hbsGroupEnd}}}`;
    }

    link(entry) {
        return `{{> ${this.hbsDocRef} resolved=${entry.resolved} doc_title="${entry.title}" ref="${entry.ref}" external=${entry.external} }}`;
    }

    indent(level) {
        return "\t".repeat(level);
    }

    mapGroup(entry, level) {
        const start = this.startGroup(entry.title, level);
        const end = this.endGroup();
        const content = entry.groups
            .map(nested => nested.groups ? this.mapGroup(nested, level+1) : this.link(nested) )
            .map(s => this.indent(level + 1) + s)
            .join('\n');
        return `${start}
${content}
${this.indent(level)}${end}`;
    }

}

module.exports = {Document, Group, MenuContent};
