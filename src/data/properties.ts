// Simple TypeScript type for a property point on the map.
export type PropertyPoint = {
    id: number;
    name: string;
    address: string;
    lng: number;
    lat: number;
};

// Hard-coded sample properties for now.
// Later we'll replace this with data loaded from an API or database.
export const properties: PropertyPoint[] = [
    {
        id: 1,
        name: "Test Office A",
        address: "Somewhere in the City",
        lng: -0.09,
        lat: 51.515,
    },
    {
        id: 2,
        name: "Test Office B",
        address: "Somewhere in Westminster",
        lng: -0.13,
        lat: 51.505,
    },
];
