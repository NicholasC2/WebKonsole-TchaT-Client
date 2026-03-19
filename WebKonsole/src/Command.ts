import { Konsole } from "./Konsole";

type CommandRun = (
    args: string[]
) => Promise<string | void>;
  
class Command {
    alias: string;
    run: CommandRun;
  
    constructor(
        alias: string,
        run: CommandRun = async () => "Command is missing a run function."
    ) {
        this.alias = alias;
        this.run = run;
    }
}

const commands: Command[] = []

export function getCommands() {
    return [...commands];
}

export function createCommand(alias: string, run: CommandRun) {
    if(!alias || alias.trim() == "") {
        throw new SyntaxError("Command must have alias");
    }

    if (alias.includes(" ")) {
        throw new SyntaxError("Command alias cannot contain spaces");
    }
    
    const exists = commands.some(c => c.alias === alias);

    if (exists) {
        throw new Error(`Command ${alias} already exists`);
    }

    commands.push(new Command(alias, run));
}

export function deleteCommand(alias: string) {
    const index = commands.findIndex(c => c.alias === alias);

    if (index !== -1) {
        commands.splice(index, 1);
    }
}

export function registerDefaultCommands() {
    createCommand(
        "echo",
        async function (this: Konsole, args) {
            if (args.length === 0) return "<err>Usage: echo <text></err>";
            return args.join(" ");
        }
    );

    createCommand(
        "clear",
        async function (this: Konsole, args) {
            if(args[0] == "--help") {
                return "Clears the terminal screen."
            } else {
                this.container.innerHTML = "";
            }
        }
    );

    createCommand(
        "wait",
        async function (this: Konsole, args) {
            if(args[0] == "--help") {
                return "Delays for a specified amount of milliseconds"
            } else {
                const time = parseInt(args[0], 10);
                if (isNaN(time) || time < 0) return "<err>Usage: wait <milliseconds></err>";
                await new Promise(res => setTimeout(res, time));
            }
        }
    );

    createCommand(
        "help", 
        async function (this: Konsole, args) {
            if(args[0] == "--help") {
                return "Displays all available commands"
            } else {
                return "Available Commands:\n" + commands.map(cmd => `  ${cmd.alias}`).join("\n");
            }
        }
    );

    createCommand(
        "ver",
        async function () {
            return [
                "Konsole Info:",
                `  Version : {version}`,
                `  Branch  : {branch}`,
                `  Dev     : NicholasC`
            ].join("\n");
        }
    );

    createCommand(
        "nl",
        async function (this: Konsole, args) {
            if(args[0] == "--help") {
                return "Prints a new line"
            } else {
                return "\n";
            }
        }
    );

    createCommand(
        "vars",
        async function (this: Konsole, args) {
            if(args[0] == "--help") {
                return "Lists all variables."
            } else {
                const vars = Object.entries(this.options.variables);
                if (vars.length === 0) return "<err>No variables defined.</err>";
                
                return "Available Variables:\n" +
                    vars.map(([key, value]) => `  ${key} = ${value.includes("\n") ? `[${value.split("\n")[0]}...]` : value}`).join("\n");
            }
        }
    );

    createCommand(
        "about",
        async function () {
            return [
                "For use where a console is needed on the web",
                "  Created by: NicholasC",
                "  ASCII Art Source: {ascii_gen}"
            ].join("\n");
        }
    );

    createCommand(
        "set",
        async function (this: Konsole, args) {
            if(args[0] == "--help") {
                return "Sets a variable for use in commands."
            } else {
                if (args.length < 2) return "<err>Usage: set <variable> <value></err>";
                const [key, ...valueParts] = args;
                const value = valueParts.join(" ");
                this.options.variables[key] = value;
                return `Variable ${key} set to "${value}"`;
            }
        }
    );

    createCommand(
        "run",
        async function(this: Konsole, args) {
            if(args[0] == "--help") {
                return "Runs a \".js\" script."
            } else {
                try {
                    if(args.length < 1) return "<err>Usage: run <script location></err>";
                    const result = await fetch(args[0])
                    if(!result.ok) return "<err>Inaccessible script location</err>";
                    const script = await result.text()

                    const blob = new Blob([script], { type: "text/javascript" });
                    const url = URL.createObjectURL(blob);

                    const module = await import(url);
                    URL.revokeObjectURL(url);

                    if (typeof module.default !== "function") {
                        return "<err>Script has no default function</err>";
                    }

                    return await module.default.call(this);
                } catch(err: unknown) {
                    if (err instanceof Error) {
                        return `<err>Error running script: ${err.message}</err>`;
                    }
                    return `<err>Error running script: ${String(err)}</err>`;
                }
            }
        }
    );

    createCommand(
        "pause",
        async function(this: Konsole, args) {
            if(args[0] == "--help") {
                return "pauses until the user presses enter."
            } else {
                this.update("Press enter to continue...")
                return new Promise((resolve) => {
                    this.container.addEventListener("keydown", (event)=>{
                        if(event.key == "Enter") {
                            resolve();
                        }
                    })
                })
            }
        }
    );
}