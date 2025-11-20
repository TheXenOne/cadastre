export function propertyTypeLabel(code?: string | null) {
    switch ((code ?? "").toUpperCase()) {
        case "D": return "Detached";
        case "S": return "Semi-detached";
        case "T": return "Terraced";
        case "F": return "Flat / maisonette";
        case "O": return "Other";
        default: return "Unknown";
    }
}
