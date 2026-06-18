// Empty marker base — exists only to constrain the generic Entity parameter
// in the Mapper<Entity, Domain> interface. Carries no fields of its own;
// every entity declares its own primary key explicitly.
export abstract class AbstractEntity {}
