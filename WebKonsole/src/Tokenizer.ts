export function tokenize(input: string, delimiter: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inSingle = false;
    let inDouble = false;
    let escaped = false;

    for (let i = 0; i < input.length; i++) {
        const char = input[i];

        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }

        if (char === "\\") {
            escaped = true;
            continue;
        }

        if (char === "'" && !inDouble) {
            inSingle = !inSingle;
            continue;
        }

        if (char === '"' && !inSingle) {
            inDouble = !inDouble;
            continue;
        }

        if (char === delimiter && !inSingle && !inDouble) {
            if (current.trim()) tokens.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }

    if (current.trim()) tokens.push(current.trim());

    return tokens;
}
