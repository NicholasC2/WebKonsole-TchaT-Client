/**
 * @this {import("./WebKonsole/src/Konsole").Konsole}
 */
export default async function() {
    this.cursor.hidden = false;

    this.update("Enter something: ");

    await new Promise((resolve) => {
        const handler = (e) => {
            if (e.key === "Enter") {
                const value = this.input.text;

                this.container.removeEventListener("keydown", handler);
                resolve(value);
            } else {
                this.input.text += e.key;
                this.update();
            }
            this.resetCursorBlink();
        };

        this.container.addEventListener("keydown", handler);
    })

    this.update(this.input.text);

    this.input.text = ""
}