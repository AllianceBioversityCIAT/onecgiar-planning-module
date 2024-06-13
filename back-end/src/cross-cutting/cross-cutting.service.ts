
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CrossCutting } from 'src/entities/cross-cutting.entity';
import { History } from 'src/entities/history.entity';
import { IsNull, Repository } from 'typeorm';

@Injectable()
export class CrossCuttingService {
  constructor(
    @InjectRepository(CrossCutting)
    private CrossCuttingRepository: Repository<CrossCutting>,
    @InjectRepository(History)
    private HistoryRepository: Repository<History>,
  ) {}

  findAll() {
    return this.CrossCuttingRepository.find();
  }

  findByInitiativeID(id) {
    return this.CrossCuttingRepository.find({
      where: { initiative: { id: id }, submission_id: IsNull() },
    });
  }

  findBySubmissionID(id) {
    return this.CrossCuttingRepository.find({ where: { submission_id: id } });
  }

  create(data: any , user) {
    return this.CrossCuttingRepository.save(this.CrossCuttingRepository.create({ ...data })).then(
      (data: any) => {
        Object.keys(data).forEach(async key => {
          const value = data[key];
          const history = this.HistoryRepository.create();
          if(key == 'title') {
            history.resource_property = 'Add new Cross-Cutting Title';
            history.item_name = 'Cross-Cutting';
            history.old_value = null;
            history.new_value = value;
            history.user_id = user.id;
            history.initiative_id = data.initiative_id;
            await this.HistoryRepository.save(history);
          } else if(key == 'description' && value) {
            history.resource_property = `Add new Cross-Cutting description for (${data.title})`;
            history.item_name = 'Cross-Cutting';
            history.old_value = null;
            history.new_value = value;
            history.user_id = user.id;
            history.initiative_id = data.initiative_id;
            await this.HistoryRepository.save(history);
          }
        });
      }, 
      (error) => {
        console.log(error)
      }
    );
  }
  findOne(id: string) {
    return this.CrossCuttingRepository.findOneBy({ id });
  }

  async update(id: string, data: any, user) {
    const cross = await this.CrossCuttingRepository.findOne({
      where: {
        id: id
      }
    });
    let oldData = {
      id: id,
      title: cross.title,
      description: cross.description,
      initiative_id: cross.initiative_id,
      submission_id: null
    }
    cross.title = data.title;
    cross.description = data.description;
    const objDifference = this.getDifference(oldData, cross);

    await this.CrossCuttingRepository.save(cross).then(
      (data) => {
        Object.keys(objDifference).forEach(async key => {
          const value = objDifference[key];
          const history = this.HistoryRepository.create();
          if(key == 'title') {
            history.resource_property = 'Edit the title of the cross-cutting';
            history.old_value = oldData.title;
            history.new_value = value.toString();
          } else if(key == 'description') {
            if((oldData.description == null || oldData.description == '') && data.description != null) {
              history.resource_property = `Add new Cross-Cutting description for (${data.title})`;
              history.old_value = null;
              history.new_value = value.toString();
            } else if(oldData.description != null && data.description != null && data.description != '') {
              history.resource_property = `Edit Cross-Cutting description for (${data.title})`;
              history.old_value = oldData.description;
              history.new_value = value.toString();
            } else if(oldData.description != null && data.description == '') {
              history.resource_property = `Remove Cross-Cutting description for (${data.title})`;
              history.old_value = oldData.description;
              history.new_value = null;
            }
          }
          history.item_name = 'Cross-Cutting';
          history.user_id = user.id;
          history.initiative_id = data.initiative_id;
          await this.HistoryRepository.save(history);
        }); 
      },
      (error) => {
        console.log(error);
      }
    );
  }

  getDifference(a,b) {
    return Object.fromEntries(Object.entries(b).filter(([key, val]) => key in a && a[key] !== val));
  }

  async remove(id: string, user) {
    const cross = await this.CrossCuttingRepository.findOne({
      where: {
        id: id
      }
    });

    return this.CrossCuttingRepository.delete({id}).then(
       async () => {
        const history = this.HistoryRepository.create();
        history.item_name = 'Cross-Cutting';
        history.resource_property = `Delete cross-cutting`;
        history.old_value = cross.title;
        history.new_value = null;
        history.user_id = user.id;
        history.initiative_id = cross.initiative_id;
        return await this.HistoryRepository.save(history);
      }, 
      (error) => {
        console.log(error);
      }
    );
  }
}
