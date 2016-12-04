'use strict';

exports.template = `
    <ui-prop name="${Editor.T('BUILDER.template')}">
        <ui-select class="flex-1" v-value="data.template">
            <template v-for="item in templates">
                <option v-bind:value="item">{{item}}</option>
            </template>
        </ui-select>
    </ui-prop>

    <ui-prop name="VS Version" auto-height>
        <ui-select class="flex-1" v-value="data.vsVersion">
            <template v-for="item in vsVersions">
                <option v-bind:value="item.value">{{item.text}}</option>
            </template>
        </ui-select>
    </ui-prop>
`;

exports.props = {
    'data': null,
    'project': null
};

exports.data = function () {
    return {
        templates: [],
        vsVersions: [
            { value: "auto", text: "Auto" },
            { value: "2013", text: "VS2013" },
            { value: "2015", text: "VS2015" }
        ]
    };
};

exports.created = function () {
    Editor.Ipc.sendToMain('app:query-cocos-templates', (error, list) => {
        if (error)
            return Editor.warn(error);
        list.forEach((item) => {
            this.templates.push(item);
        });

        if (!this.data) return;
        var template = this.data.template;
        if (list.length <= 0) {
            return this.set('profiles.local.template', '');
        }
        if (list.indexOf(template) === -1) {
            this.set('profiles.local.template', list[0]);
        }
    });
};

exports.directives = {};

exports.methods = {};