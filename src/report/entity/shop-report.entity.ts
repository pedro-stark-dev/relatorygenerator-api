import {
    Column,
    CreateDateColumn,
    Entity,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';

@Entity('reports')
export class ShopReportEntity {
    @PrimaryGeneratedColumn()
    id: number;
    @Column({
        type: 'varchar',
        length: 150,
        nullable: false,
    })
    name: string;
    @Column({
        type: 'varchar',
        length: 150,
        nullable: false
    })
    shop: string;
    // Valor bruto total
    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    grossTotalAmount: number;

    // Quantidade total de vendedores
    @Column({
        type: 'int',
        default: 0,
    })
    totalSellers: number;

    // PIX
    @Column({
        type: 'int',
        default: 0,
    })
    pixTransactionCount: number;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    pixTotalAmount: number;

    // Débito
    @Column({
        type: 'int',
        default: 0,
    })
    debitTransactionCount: number;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    debitTotalAmount: number;

    // Crédito
    @Column({
        type: 'int',
        default: 0,
    })
    creditTransactionCount: number;

    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    creditTotalAmount: number;

    // Valor líquido
    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    netTotalAmount: number;

    // Taxas totais
    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    totalFeesAmount: number;

    // Ticket médio
    @Column({
        type: 'decimal',
        precision: 12,
        scale: 2,
        default: 0,
    })
    averageTicket: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}