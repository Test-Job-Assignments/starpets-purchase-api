export interface Mapper<Entity, Domain> {
  toDomain(entity: Entity): Domain;
  toEntity(domain: Domain): Entity;
}
