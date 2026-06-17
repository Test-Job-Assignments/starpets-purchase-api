export class Purchase {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public readonly buyerId: string,
    public readonly pricePaid: string,
  ) {}
}
