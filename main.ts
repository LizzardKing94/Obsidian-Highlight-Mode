import { Plugin, Editor, Notice, MarkdownView } from "obsidian";

export default class HighlightModePlugin extends Plugin {
    private highlightMode: boolean = false;
    private timeoutId: number | null = null;

    async onload() {
        this.addCommand({
            id: "toggle-highlight-mode",
            name: "Toggle Highlight Mode",
            callback: () => this.toggleHighlightMode(),
        });

        console.log("✅ Highlight Mode plugin loaded.");
    }

    onunload() {
        this.unregisterSelectionListener();
    }

    toggleHighlightMode() {
        this.highlightMode = !this.highlightMode;
        new Notice(`Highlight Mode: ${this.highlightMode ? "ON" : "OFF"}`);
        console.log(`🟡 Highlight Mode is now: ${this.highlightMode ? "ON" : "OFF"}`);

        if (this.highlightMode) {
            this.registerSelectionListener();
        } else {
            this.unregisterSelectionListener();
        }
    }

    registerSelectionListener() {
        this.app.workspace.on("active-leaf-change", () => {
            console.log("🔄 Active leaf changed.");
            this.attachEditorHandler();
        });

        this.attachEditorHandler();
    }

    attachEditorHandler() {
        const activeLeaf = this.app.workspace.activeLeaf;
        if (activeLeaf && activeLeaf.view instanceof MarkdownView) {
            const editor = activeLeaf.view.editor;
            console.log("🟢 Selection listener attached.");

            this.registerDomEvent(document, "mouseup", () => this.handleSelectionEnd(editor));
            this.registerDomEvent(document, "touchend", () => this.handleSelectionEnd(editor));
        }
    }

    unregisterSelectionListener() {
        console.log("🔴 Selection listener removed.");
    }

    handleSelectionEnd(editor: Editor) {
        if (!this.highlightMode) return;

        const selection = editor.getSelection().trim();
        if (!selection) return;

        console.log(`✏️ Selection completed: "${selection}"`);

        // Check if selection is already highlighted based on backward scan
        if (!this.isHighlightAllowed(editor, selection)) {
            console.log("⚠️ Highlighting is NOT allowed (blocked by `=` before selection). Skipping.");
            return;
        }

        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = window.setTimeout(() => {
            this.applyHighlight(editor, selection);
        }, 1000);
    }

    applyHighlight(editor: Editor, selection: string) {
        console.log(`✅ Highlighting text: "${selection}"`);

        // 🔹 Change #1: Modify Highlight Format
        const newText = `==${selection}==%% %%`;

        editor.replaceSelection(newText);

        // 🔹 Change #2: Move Cursor Forward by 3 (so it's inside `%% %%`)
        const cursorPos = editor.getCursor();
        cursorPos.ch -= 3;
        editor.setCursor(cursorPos);
    }

    isHighlightAllowed(editor: Editor, selection: string): boolean {
        const fullText = editor.getValue();
        const selectionIndex = fullText.indexOf(selection);

        // If selection not found in the document, allow highlighting
        if (selectionIndex === -1) return true;

        // Scan **BACKWARDS** one character at a time
        for (let i = selectionIndex - 1; i >= 0; i--) {
            const char = fullText[i];

            if (char === "=") {
                return false; // Block highlighting
            }

            if (char === "%") {
                return true; // Allow highlighting
            }
        }

        // If neither "=" nor "%" is found all the way to the start, allow highlighting
        return true;
    }
}
