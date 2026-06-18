import { AbstractDomain } from '@/common/domain/abstract.domain';
import { AbstractEntity } from '@/common/entities/abstract.entity';

export interface Mapper<
  Entity extends AbstractEntity,
  Domain extends AbstractDomain,
> {
  toDomain(entity: Entity): Domain;
  toEntity(domain: Domain): Entity;
}
