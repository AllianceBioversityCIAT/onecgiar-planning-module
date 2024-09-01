import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Variable } from 'src/entities/variable.entity';
import { Repository } from 'typeorm';

@Injectable()
export class VariableService {
    constructor(@InjectRepository(Variable) public repo: Repository<Variable>
    ){}

    findOneById(id:number) {
        return this.repo.findOne({
            where: {
                id: id
            }
        })
    }
}
