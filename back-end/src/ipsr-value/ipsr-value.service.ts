import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IpsrValue } from 'src/entities/ipsr-value.entity';
import { IpsrService } from 'src/ipsr/ipsr.service';
import { IsNull, Not, Repository } from 'typeorm';
import { History } from 'src/entities/history.entity';

@Injectable()
export class IpsrValueService {
  constructor(
    @InjectRepository(IpsrValue)
    private ipsrValueRepository: Repository<IpsrValue>,
    private ipsrService: IpsrService,
    @InjectRepository(History)
    private HistoryRepository: Repository<History>,
  ) {}

  findByInitiativeID(id) {
    return this.ipsrValueRepository.find({
      where: {
        initiative: { id: id },
        submission_id: IsNull(),
        value: Not(IsNull()),
      },
      relations: ['ipsr'],
    });
  }

  findBySubmissionId(id) {
    return this.ipsrValueRepository.find({
      where: { submission_id: id, value: Not(IsNull()) },
      relations: ['ipsr'],
    });
  }

  findAll() {
    return this.ipsrValueRepository.find();
  }

  create(data: any) {
    return this.ipsrValueRepository.save(
      this.ipsrValueRepository.create({ ...data }),
    );
  }
  findOne(id: string) {
    return this.ipsrValueRepository.findOneBy({ id });
  }

  update(id: string, data: any) {
    return this.ipsrValueRepository.update({ id }, { ...data });
  }
  remove(id: string) {
    return this.ipsrValueRepository.delete({ id });
  }

  async save(data: any, user) {

    // console.log('data =>', data)
    const { initiative_id } = data;
    const ipsrs = await this.ipsrService.findAll();
    let newArrValues = [];
    let oldArrValues = [];
    let newData = [];


    for (let ipsr of ipsrs) {
      let ipsr_value: IpsrValue;
      ipsr_value = await this.ipsrValueRepository.findOne({
        where: {
          initiative_id: initiative_id,
          ipsr_id: ipsr.id,
          submission_id: IsNull(),
        }, 
        relations: ['ipsr']
      });

      
      if(ipsr_value) {
        if(ipsr_value.value != data['value-' + ipsr.id] || ipsr_value.description != data['description-' + ipsr.id]) {
          let oldObjIpsr = {
            id: ipsr_value.id,
            ipsr_id: ipsr_value.ipsr_id,
            initiative_id: ipsr_value.initiative_id,
            value: ipsr_value.value,
            description: ipsr_value.description,
            submission_id: ipsr_value.submission_id
          }
          oldArrValues.push(oldObjIpsr);
          newArrValues.push(ipsr_value);
        }
 
      }
      else {
        ipsr_value = this.ipsrValueRepository.create();
        newData.push(ipsr_value)
      } 
      ipsr_value.initiative_id = Number(initiative_id);
      ipsr_value.ipsr_id = ipsr.id;
      ipsr_value.value = data['value-' + ipsr.id];
      ipsr_value.description = data['description-' + ipsr.id];
      await this.ipsrValueRepository.save(ipsr_value);
    }
    console.log('arr =>', newArrValues);
    console.log('oldArr =>', oldArrValues);
    console.log('newData =>', newData);



    for(let newIpsr of newArrValues) {
      for(let oldIpsr of oldArrValues) {
        if(oldIpsr.id == newIpsr.id) {
          const objDifference = this.getDifference(oldIpsr, newIpsr);

          Object.keys(objDifference).forEach(async key => {
            const value = objDifference[key];
            const history = this.HistoryRepository.create();
            console.log(`key: ${key}   |  value: ${value} `);
            if(key == 'value') {
              if((oldIpsr.value == '' || oldIpsr.value == null) && (newIpsr.value != '' || newIpsr.value != null)){
                history.resource_property = `Add new IPSR value for (${newIpsr.ipsr.title})`;
                history.old_value = null;
                history.new_value = value.toString();
              } else if(oldIpsr.value != null && newIpsr.value != '' && newIpsr.value != null){
                history.resource_property = `Edit IPSR value for (${newIpsr.ipsr.title})`;
                history.old_value = oldIpsr.value;
                history.new_value = value.toString();
              } else {
                history.resource_property = `Remove IPSR value for (${newIpsr.ipsr.title})`;
                history.old_value = oldIpsr.value;
                history.new_value = null;
              }
            } else if(key == 'description') {
              if((oldIpsr.description == '' || oldIpsr.description == null) && (newIpsr.description != '' || newIpsr.description != null)){
                history.resource_property = `Add new IPSR description for (${newIpsr.ipsr.title})`;
                history.old_value = null;
                history.new_value = value.toString();
              } else if(oldIpsr.description != null && newIpsr.description != '' && newIpsr.description != null){
                history.resource_property = `Edit IPSR description for (${newIpsr.ipsr.title})`;
                history.old_value = oldIpsr.description;
                history.new_value = value.toString();
              } else {
                history.resource_property = `Remove IPSR description for (${newIpsr.ipsr.title})`;
                history.old_value = oldIpsr.description;
                history.new_value = null;
              }

            }
            history.item_name = 'IPSR';
            history.user_id = user.id;
            history.initiative_id = data.initiative_id;
            await this.HistoryRepository.save(history);
          });
          // console.log('objDifference =>', objDifference)
        }

      }

      // create new
      // for(let newIpsr of newData) {

      // }
    }
    return {message:'Data Saved'}
  }
  getDifference(a,b) {
    return Object.fromEntries(Object.entries(b).filter(([key, val]) => key in a && a[key] !== val));
  }
}
