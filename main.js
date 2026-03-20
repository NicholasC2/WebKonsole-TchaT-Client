/**
 * @this {import("./WebKonsole/src/Konsole").Konsole}
 */
export default async function() {
    this.cursor.hidden = false;
    
    let running = true;

    let IP;
    let IP_valid = false;
    while(!IP_valid) {
        this.update("\n");
        IP = await readline(this, "TchaT IP: ");

        await new Promise((resolve) => {
            if(IP == false) {
                running = false;
                resolve();
            }

            const websocket = new WebSocket("wss://"+IP); // GOTTA USE SOCKET.IO

            websocket.onopen = ()=>{
                websocket.send(JSON.stringify({
                    type: "check-valid"
                }))
            }

            websocket.onmessage = (event)=>{
                if(event.data.validTchaT == true) {
                    IP_valid = true;
                    resolve();
                }
                console.log(event.data);
            }

            const invalidate = () => {
                IP_valid = false;
                resolve();
            };

            websocket.onclose = invalidate;
            websocket.onerror = invalidate;
        })
    }

    while(running) {
        const input = await readline(this, "> ");

        if(input == false) {
            running = false;
        }

        if(input.startsWith("/")) {
            const args = input.slice(1).split(" ");
            const command = args.shift();

            switch(command) {
                case "help": {
                    this.update("no help text");
                    
                    break;
                }
            }
        }
    }

    this.input.text = ""
}
/**
 * @param {import("./WebKonsole/src/Konsole").Konsole} terminal
 */
async function readline(terminal, prompt = "> ") {
    terminal.update(prompt);
    return await new Promise((resolve) => {
        const handler = async(e) => {
            if (e.ctrlKey && e.key.toLowerCase() == "c") {
                terminal.container.removeEventListener("keydown", handler);
                resolve(false);
                return;
            }

            e.preventDefault();
            terminal.resetCursorBlink();

            const input = terminal.input.text;

            switch (e.key) {
                case "Enter":
                    if(e.shiftKey) {
                        terminal.input.text += "\n";
                    } else {
                        terminal.input.text = "";
                        terminal.update(input);
                        terminal.container.removeEventListener("keydown", handler);
                        resolve(input);
                        return;
                    }
                    break;

                case "Backspace":
                    terminal.input.text = input.slice(0,-1)
                    break;

                default:
                    if (e.ctrlKey && e.key.toLowerCase() === "l") {
                        terminal.container.innerHTML = "";
                    } else if (e.ctrlKey && e.key.toLowerCase() === "v") {
                        const text = await navigator.clipboard.readText();
                        terminal.input.text += text;
                    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
                        terminal.input.text += e.key;
                    }
                    break;
            }

            terminal.scrollToBottom();
            terminal.update();
        };

        terminal.container.addEventListener("keydown", handler);
    })
}