import { Plugin, Editor, Notice, MarkdownView } from "obsidian";

export default class HighlightModePlugin extends Plugin {
    private highlightMode: boolean = false;
    private timeoutId: number | null = null;
    private userTriggeredSelection: boolean = false;

    async onload() {
        this.addCommand({
            id: "toggle-highlight-mode",
            name: "Toggle Highlight Mode",
            callback: () => this.toggleHighlightMode(),
        });
    }

    onunload() {
        this.unregisterSelectionListener();
    }

    toggleHighlightMode() {
        this.highlightMode = !this.highlightMode;
        new Notice(`Highlight Mode: ${this.highlightMode ? "ON" : "OFF"}`);

        if (this.highlightMode) {
            this.registerSelectionListener();
        } else {
            this.unregisterSelectionListener();
        }
    }

    registerSelectionListener() {
        this.app.workspace.on("active-leaf-change", () => {
            this.attachEditorHandler();
        });

        this.attachEditorHandler();
    }

    attachEditorHandler() {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf && activeLeaf.view instanceof MarkdownView) {
            const editor = activeLeaf.view.editor;

            this.registerDomEvent(document, "mousedown", () => {
                this.userTriggeredSelection = true;
            });
            this.registerDomEvent(document, "touchstart", () => {
                this.userTriggeredSelection = true;
            });
            this.registerDomEvent(document, "mouseup", () => this.handleSelectionEnd(editor));
            this.registerDomEvent(document, "touchend", () => this.handleSelectionEnd(editor));
        }
    }

    unregisterSelectionListener() {}

    handleSelectionEnd(editor: Editor) {
        if (!this.highlightMode || !this.userTriggeredSelection) {
            this.userTriggeredSelection = false;
            return;
        }

        this.userTriggeredSelection = false;
        const selection = editor.getSelection().trim();
        if (!selection) return;

        if (!this.isHighlightAllowed(editor, selection)) return;

        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = window.setTimeout(() => {
            this.applyHighlight(editor, selection);
        }, 1000);
    }

    applyHighlight(editor: Editor, selection: string) {
        const newText = `==${selection}==%% %%`;
        editor.replaceSelection(newText);

        const cursorPos = editor.getCursor();
        cursorPos.ch -= 3;
        editor.setCursor(cursorPos);
    }

    isHighlightAllowed(editor: Editor, selection: string): boolean {
        const fullText = editor.getValue();
        const selectionIndex = fullText.indexOf(selection);

        if (selectionIndex === -1) return true;

        // Check if selection starts or ends with '='
        if (selection.startsWith("=") || selection.endsWith("=")) {
            return false;
        }

        // Scan backwards from selection start
        for (let i = selectionIndex - 1; i >= 0; i--) {
            const char = fullText[i];

            if (char === "=") {
                return false;
            }

            if (char === "%") {
                return true;
            }
        }

        // If neither '=' nor '%' was found before selection, allow highlight
        return true;
    }
}
