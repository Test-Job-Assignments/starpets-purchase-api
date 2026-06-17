import { PrimaryColumn } from 'typeorm';

// PostgreSQL has built-in UUID generation, but not UUIDv7.
// We generate UUIDv7 in application code before insert.
export default abstract class AbstractEntity {
  @PrimaryColumn('uuid')
  id!: string;
}
