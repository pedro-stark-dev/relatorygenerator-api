import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entity/user.entity';
import { CreateUserDto } from './dto/create.user.dto';
import { UpdateUserDto } from './dto/update.user.dto';
import bcrypt from "bcrypt"

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private readonly usersRepository: Repository<User>,
    ) { }

    async create(createUserDto: CreateUserDto) {
        const exists = await this.usersRepository.findOne({
            where: {
                username: createUserDto.username,
            },
        });

        if (exists) {
            throw new BadRequestException('Usuário já existe');
        }

        // HASH DA SENHA
        const hashedPassword = await bcrypt.hash(
            createUserDto.password,
            10,
        );

        const user = this.usersRepository.create({
            username: createUserDto.username,
            password: hashedPassword,
        });

        await this.usersRepository.save(user);

        return {
            id: user.id,
            username: user.username,
            createdAt: user.createdAt,
        };
    }

    async findAll() {
        return this.usersRepository.find({
            select: {
                id: true,
                username: true,
                createdAt: true,
            },
        });
    }
    async findByUsername(username: string) {
        return this.usersRepository.findOne({
            where: {
                username,
            },
        });
    }
    async findOne(id: number) {
        const user = await this.usersRepository.findOne({
            where: {
                id,
            },

            select: {
                id: true,
                username: true,
                createdAt: true,
            },
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        return user;
    }

    async update(id: number, updateUserDto: UpdateUserDto) {
        const user = await this.usersRepository.findOne({
            where: {
                id,
            },
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        if (updateUserDto.password) {
            updateUserDto.password = await bcrypt.hash(
                updateUserDto.password,
                10,
            );
        }

        Object.assign(user, updateUserDto);

        await this.usersRepository.save(user);

        return {
            id: user.id,
            username: user.username,
            updatedAt: user.updatedAt,
        };
    }

    async remove(id: number) {
        const user = await this.usersRepository.findOne({
            where: {
                id,
            },
        });

        if (!user) {
            throw new NotFoundException('Usuário não encontrado');
        }

        await this.usersRepository.remove(user);

        return {
            deleted: true,
        };
    }
}