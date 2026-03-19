import { createCommand, deleteCommand, getCommands, registerDefaultCommands } from "./Command";
import { tokenize } from "./Tokenizer";

export const defaultVariables = {
    "version": "1.0.06",
    "version_ascii": `\
:::    ::: ::::::::  ::::    :::  ::::::::   ::::::::  :::        :::::::::: 
:+:   :+: :+:    :+: :+:+:   :+: :+:    :+: :+:    :+: :+:        :+:        
+:+  +:+  +:+    +:+ :+:+:+  +:+ +:+        +:+    +:+ +:+        +:+        
+#++:++   +#+    +:+ +#+ +:+ +#+ +#++:++#++ +#+    +:+ +#+        +#++:++#   
+#+  +#+  +#+    +#+ +#+  +#+#+#        +#+ +#+    +#+ +#+        +#+        
#+#   #+# #+#    #+# #+#   #+#+# #+#    #+# #+#    #+# #+#        #+#        
###    ### ########  ###    ####  ########   ########  ########## ########## `, // https://patorjk.com/software/taag/#p=display&f=Alligator2&t=Konsole
    "ascii_gen": "https://patorjk.com/software/taag/",
    "branch": "stable"
}

const defaultStyle = {
    "background-color": "black",
    "box-sizing": "border-box",
    "color": "lime",
    "cursor": "text",
    "font-family": "monospace",
    "white-space": "pre-wrap",
    "overflow-wrap": "break-word",
    "padding": "5px",
    "width": "100%",
    "height": "100%",
    "overflow-y": "auto",
    "text-align": "left"
}

export class KonsoleOptions {
    initCommand: string
    prefix: string
    cursor: string
    variables: Record<string, string>

    constructor({ initCommand, prefix, cursor, variables }: Partial<KonsoleOptions> = {}) {
        this.initCommand = initCommand ?? "echo {version_ascii};echo v{version}-{branch};echo https://github.com/NicholasC2/WebKonsole";
        this.prefix = prefix ?? "$ ";
        this.cursor = cursor ?? "_";
        this.variables = Object.assign(defaultVariables, variables);
    }
}

export class Konsole {
    container: HTMLElement;
    focused: boolean = false;
    cursor: {
        hidden: boolean;
        visible: boolean;
        blinkTime: number;
        element: HTMLElement;
    };
    input: {
        text: string;
        previous: string;
        element: HTMLElement;
    };
    history: {
        index: number;
        entries: string[];
    };
    commandRunning: boolean = false;
    exitCommand: boolean = false;
    options: KonsoleOptions;
    createCommand = createCommand;
    deleteCommand = deleteCommand;
    getCommands = getCommands;

    constructor(container: HTMLElement, options: KonsoleOptions) {
        this.container = container;
        this.options = new KonsoleOptions(options);
        this.container.classList.add("konsole-defaults");

        const cssString = Object.entries(defaultStyle)
            .map(([key, value]) => `${key}: ${value};`)
            .join(" ");

        const style = document.createElement("style");
        style.textContent = `.konsole-defaults { ${cssString} }`;
        document.head.insertBefore(style, document.head.firstChild);


        registerDefaultCommands();

        this.cursor = {
            element: document.createElement("div"),
            blinkTime: 0,
            visible: false,
            hidden: false
        }

        this.input = {
            element: document.createElement("div"),
            previous: "",
            text: ""
        }

        this.history = {
            index: 0,
            entries: []
        }

        this.input.element.style.display = "inline";
        this.container.appendChild(this.input.element);
        this.cursor.element.style.userSelect = "none";
        this.container.appendChild(this.cursor.element);

        this.setupInputHandler();
        this.startBlink();
        this.runCommand(this.options.initCommand);
    }

    async formatInput(text: string) {
        let prev = "";
        do {
            prev = text;
            for (const [key, value] of Object.entries(this.options.variables)) {
                text = text.replaceAll(`{${key}}`, value);
            }
        } while (text !== prev);

        return text.replaceAll("\\n", "\n");
    }

    formatOutput(text: string) {
        let out = text
            .replaceAll(/&/g, "&amp;")
            .replaceAll(/</g, "&lt;")
            .replaceAll(/>/g, "&gt;");

        out = out.replaceAll(
            /&lt;c:([^&]+?)&gt;([\s\S]*?)&lt;\/c&gt;/g,
            (_, color:string, content:string) => `<span style="color:${color}">${content}</span>`
        );

        out = out.replaceAll(
            /&lt;err&gt;([\s\S]*?)&lt;\/err&gt;/g,
            (_, content:string) => `<span style="color:red">${content}</span>`
        );

        out = out.replaceAll(
            /(https?:\/\/[^\s]+)/g,
            `<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#4f4ff7">$1</a>`
        );

        return out;
    }

    startBlink() {
        setInterval(() => {
            this.cursor.blinkTime += 100;
            if (this.cursor.blinkTime >= 500) {
                this.cursor.visible = !this.cursor.visible;
                this.cursor.blinkTime = 0;
                this.update();
            }
        }, 100);
    }

    setupInputHandler() {
        this.container.setAttribute("tabindex", "0");

        this.container.addEventListener("keydown", async (e) => {
            if (e.ctrlKey && e.key.toLowerCase() == "c") {
                this.exitCommand = true;
                if(this.container.innerText != "") this.update("\n");
                this.update(this.options.prefix);
                this.commandRunning = false;
                return;
            }

            if (this.commandRunning) return;

            e.preventDefault();
            this.resetCursorBlink();

            const input = this.input.text;

            switch (e.key) {
                case "Enter":
                    if(e.shiftKey) {
                        this.input.text += "\n";
                    } else {
                        this.input.text = "";
                        this.update(input);
                        if (input.trim()) {
                            if (this.history.entries[0] !== input) this.history.entries.unshift(input);
                            this.history.index = 0;
                        }
                        await this.runCommand(input);
                    }
                    break;

                case "Backspace":
                    this.input.text = input.slice(0,-1)
                    break;

                case "ArrowUp":
                    this.navigateHistory(-1);
                    break;

                case "ArrowDown":
                    this.navigateHistory(1);
                    break;

                default:
                    if (e.ctrlKey && e.key.toLowerCase() === "l") {
                        this.container.innerHTML = "";
                    } else if (e.ctrlKey && e.key.toLowerCase() === "v") {
                        const text = await navigator.clipboard.readText();
                        this.input.text += text;
                    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
                        this.input.text += e.key;
                    }
                    break;
            }

            this.scrollToBottom();
            this.update();
        });

        this.container.addEventListener("focus", () => {
            this.focused = true;
            this.resetCursorBlink();
            this.update();
        });

        this.container.addEventListener("blur", () => {
            this.focused = false;
            this.update();
        });
    }

    resetCursorBlink() {
        this.cursor.visible = true;
        this.cursor.blinkTime = 0;
    }

    navigateHistory(direction: number) {
        this.history.index = Math.max(0, Math.min(this.history.index - direction, this.history.entries.length));
        const entry = this.history.entries[this.history.index - 1] || "";
        this.input.text = entry;
    }

    scrollToBottom() {
        this.container.scrollTop = this.container.scrollHeight;
    }

    update(...args: string[]) {
        let elems: HTMLElement[] = [];

        args.forEach((text)=>{
            const newElem = document.createElement("span");
            newElem.innerHTML = this.formatOutput(text);
            elems.push(newElem);
            this.container.appendChild(newElem);
        })

        if(this.input.text != this.input.previous) {
            this.input.element.innerText = this.input.text
            this.input.previous = this.input.text
            this.container.appendChild(this.input.element)
        }

        if(this.focused && this.cursor.visible && !this.cursor.hidden) {
            if(this.cursor.element.style.display != "inline") {
                this.cursor.element.style.display = "inline"
            }
        } else {
            if(this.cursor.element.style.display != "none") {
                this.cursor.element.style.display = "none"
            }
        }

        this.cursor.element.innerText = this.options.cursor
        this.container.appendChild(this.cursor.element)

        return elems;
    }

    async runCommand(inputText: string = "", inline = false) {
        this.exitCommand = false;
        this.commandRunning = true;
        this.cursor.hidden = true;
        this.cursor.visible = false;
        this.update();

        const parts = tokenize(inputText, ";");

        for (const part of parts) {
            const replacedLine = await this.formatInput(part);
            const args = replacedLine.split(" ");
            const alias = args.shift();
            if(!alias) continue;
            const command = getCommands().find(cmd => cmd.alias == alias);
            if(this.container.innerText != "") this.update("\n");

            if (command) {
                if(this.exitCommand) return
                const result = await command.run.call(this, args);
                if(this.exitCommand) return
                if (result) {
                    this.update(await this.formatInput(result));
                }
            } else {
                this.update(`<err>Unknown command: "${alias}"</err>`);
            }
        }

        if(this.exitCommand) return

        if(this.container.innerText != "") this.update("\n");
        if(!inline) this.update(this.options.prefix);
        this.commandRunning = false;
        this.cursor.hidden = false;
    }
}