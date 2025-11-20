export function newBuildLabel(code?: string | null) {
    switch ((code ?? "").toUpperCase()) {
        case "Y": return "New build";
        case "N": return "Existing build";
        default: return "Unknown";
    }
}
