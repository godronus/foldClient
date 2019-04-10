'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const foldHelper = require("./foldHelper");
const FoldClient = require("./MyFoldingRangeProvider");
const IConfiguration = require("./IConfiguration");
function loadConfiguration() {
    let config = Object.assign({}, IConfiguration.DefaultConfiguration);
    return config;
}
function getSupportedLanguages() {
    const supportedLanguages = [];
    const configuration = loadConfiguration();
    for (let prop in configuration) {
        if (prop.startsWith("[") && prop.endsWith("]")) {
            const languageName = prop.substr(1, prop.length - 2);
            supportedLanguages.push(languageName);
        }
    }
    return supportedLanguages;
}
function registerFoldingRangeProvider() {
    const configuration = loadConfiguration();
    const supportedLanguages = getSupportedLanguages();
    const foldingRangeProvider = new FoldClient.MyFoldingRangeProvider(configuration);
    vscode.languages.registerFoldingRangeProvider(supportedLanguages, foldingRangeProvider);
    return foldingRangeProvider;
}
const foldingRangeProvider = registerFoldingRangeProvider();
function activate(context) {
    context.subscriptions.push(vscode.commands.registerCommand('godronus-foldClient.all', () => {
        foldHelper.unFoldAllRegions();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('godronus-foldClient.named', () => {
        foldHelper.showOnlyNamedSettings();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('godronus-foldClient.hide', () => {
        foldHelper.foldAllRegions();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('godronus-foldClient.setClients', () => {
        setVisibleClients();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('godronus-foldClient.wrapWithRegion', () => {
        wrapSelectedWithRegion();
    }));
    function setVisibleClients() {
        const config = vscode.workspace.getConfiguration('foldclient');
        const clientConfigList = config.get("visibleClients", []).map((s) => s.toLowerCase());
        vscode.window.showInputBox({
            value: clientConfigList.join(', '),
            placeHolder: 'Comma seperated list: e.g. itv, rtv, banijay',
        }).then((newClientsStr) => {
            const newClients = newClientsStr.split(',').map((cn) => cn.trim().toLowerCase()).filter((nm) => nm.length);
            config.update("visibleClients", newClients, true).then(() => {
                //could show update message here ??
            });
        });
    }
    function wrapSelectedWithRegion() {
        let config = loadConfiguration();
        if (vscode.window.activeTextEditor) {
            /* #region Get the configuration for the current language */
            var ate = vscode.window.activeTextEditor;
            const languageId = ate.document.languageId;
            const currentLanguageConfig = config["[" + languageId + "]"];
            if (typeof currentLanguageConfig === "undefined" ||
                !currentLanguageConfig) {
                vscode.window.showInformationMessage("folderClient Region Folding. No region folding available for language '" +
                    languageId + "'. Check that you have the language extension installed for these files.");
                return;
            }
            /* #endregion */
            /* #region Check if there is anything selected. */
            if (ate.selections.length > 1 || ate.selections.length < 1) {
                return;
            }
            var sel = ate.selection;
            if (sel.isEmpty) {
                return;
            }
            /* #endregion */
            var linePrefix = ate.document.getText(new vscode.Range(new vscode.Position(sel.start.line, 0), sel.start));
            var addPrefix = "";
            if (/^\s+$/.test(linePrefix)) {
                addPrefix = linePrefix;
            }
            var eol = getEOLStr(ate.document.eol);
            //Get the position of [NAME] in the fold start template.
            let regionStartTemplate = currentLanguageConfig.foldStart;
            const idx = regionStartTemplate.indexOf("[NAME]");
            const nameInsertionIndex = idx < 0 ? 0 : regionStartTemplate.length - "[NAME]".length - idx;
            const regionStartText = regionStartTemplate.replace("[NAME]", "");
            ate
                .edit(edit => {
                //Insert the #region, #endregion tags
                edit.insert(sel.end, eol + addPrefix + currentLanguageConfig.foldEnd);
                edit.insert(sel.start, regionStartText + eol + addPrefix);
            })
                .then(edit => {
                //Now, move the selection point to the [NAME] position.
                var sel = ate.selection;
                var newLine = sel.start.line - 1;
                var newChar = ate.document.lineAt(newLine).text.length - nameInsertionIndex;
                var newStart = sel.start.translate(newLine - sel.start.line, newChar - sel.start.character);
                var newSelection = new vscode.Selection(newStart, newStart);
                ate.selections = [newSelection];
                //Format the document
                vscode.commands.executeCommand("editor.action.formatDocument", "editorHasDocumentFormattingProvider && editorTextFocus", true);
            });
        }
    }
    /* #endregion */
    /* #region  Subscribe to configuration changes */
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        foldingRangeProvider.configuration = loadConfiguration();
    }));
    /* #endregion */
}
exports.activate = activate;
var getEOLStr = function (eol) {
    if (eol === vscode.EndOfLine.CRLF) {
        return "\r\n";
    }
    return "\n";
};
function deactivate() {
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map