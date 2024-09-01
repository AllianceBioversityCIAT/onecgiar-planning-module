import {
  BadRequestException,
  Injectable,
  StreamableFile,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/entities/user.entity';
import { Brackets, Not, Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as XLSX from 'xlsx-js-style';
import { join } from 'path';
import { createReadStream, unlink } from 'fs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) public userRepository: Repository<User>,
  ) {}
  sort(query) {
    if (query?.sort) {
      let obj = {};
      const sorts = query.sort.split(',');
      obj[sorts[0]] = sorts[1];
      return obj;
    } else return { 'user.id': 'ASC' };
  }
  async getUsers(query: any) {
    const take = query.limit || 10;
    const skip = (Number(query.page) - 1) * take;
    const result = this.userRepository.createQueryBuilder('user')
    .leftJoinAndSelect('user.user_init_roles', 'user_init_roles')
    .leftJoinAndSelect('user_init_roles.initiative', 'initiative');
    result
      .where(
        new Brackets((qb) => {
          qb.where('user.email LIKE :email', {
            email: `%${query?.email || ''}%`,
          }).orWhere('full_name LIKE :full_name', {
            full_name: `%${query?.email || ''}%`,
          });
        }),
      )
      .orderBy(this.sort(query));
    if (query.role) result.andWhere('user.role = :role', { role: query.role });
    else
      result
        .andWhere('user.role IS NOT NULL')
        .skip(skip || 0)
        .take(take || 10);

    const finalResult = await result.getManyAndCount();

    return {
      result: finalResult[0],
      count: finalResult[1],
    };
  }

  findOneByEmail(email: string) {
    return this.userRepository.findOneBy({ email });
  }

  async create(createUserDto: CreateUserDto) {
    const userExist = await this.userRepository.findOne({
      where: {
        email: createUserDto.email,
      },
    });
    if (!userExist) {
      const newUser = this.userRepository.create({ ...createUserDto });
      return this.userRepository.save(newUser);
    } else {
      throw new BadRequestException('User already exists');
    }
  }

  findAll() {
    return this.userRepository.find();
  }

  findOne(id: number) {
    return this.userRepository.findOne({ where: { id } });
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const userExist = await this.userRepository.findOne({
      where: {
        id: Not(id),
        email: updateUserDto.email,
      },
    });
    if (!userExist) {
      return this.userRepository.update({ id }, { ...updateUserDto });
    } else {
      throw new BadRequestException('User already exists');
    }
  }

  remove(id: number) {
    return this.userRepository.delete({ id });
  }

  searchUsers(term: string) {
    return this.userRepository
      .createQueryBuilder('user')
      .where('user.full_name like :name', { name: `%${term}%` })
      .orWhere('user.email like :email', { email: `%${term}%` })
      .orderBy('user.full_name')
      .getMany();
  }

  async exportExcel(query: any) { 
    const result = this.userRepository.createQueryBuilder('user')
    .leftJoinAndSelect('user.user_init_roles', 'user_init_roles')
    .leftJoinAndSelect('user_init_roles.initiative', 'initiative');
    result
      .where(
        new Brackets((qb) => {
          qb.where('user.email LIKE :email', {
            email: `%${query?.email || ''}%`,
          }).orWhere('full_name LIKE :full_name', {
            full_name: `%${query?.email || ''}%`,
          });
        }),
      )
      .orderBy(this.sort(query));
    if (query.role) result.andWhere('user.role = :role', { role: query.role });
    else result.andWhere('user.role IS NOT NULL');

    const finalResult = await result.getMany();

    const { finaldata, merges } = this.prepareUserTemplate(finalResult);

    const file_name = 'Users.xlsx';
    var wb = XLSX.utils.book_new();

    const ws = XLSX.utils.json_to_sheet(finaldata);
    ws['!merges'] = merges;


    this.appendStyleForXlsx(ws);

    this.autofitColumnsXlsx(finaldata,ws);

    XLSX.utils.book_append_sheet(wb, ws, 'Users');
    await XLSX.writeFile(
      wb,
      join(process.cwd(), 'generated_files', file_name),
      { cellStyles: true },
    );
    const file = createReadStream(
      join(process.cwd(), 'generated_files', file_name),
    );

    setTimeout(async () => {
      try {
        unlink(join(process.cwd(), 'generated_files', file_name), null);
      } catch (e) {}
    }, 9000);
    return new StreamableFile(file, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      disposition: `attachment; filename="${file_name}"`,
    });
  } 

  getTemplateUser(width = false) {
    return {
      ID: null,
      Name: null,
      Email: null,
      Role: null,
      'Initiatives and Roles': width ? 'Initiatives' : null,
      init_roles: width ? 'Roles' : null,
    };
  }

  userTemplate(template, element) {
    template.ID = element?.id;
    template.Name = element?.full_name;
    template.Email = element?.email;
    template.Role = element?.role;
  }

  prepareUserTemplate(users) {
    let finaldata = [this.getTemplateUser(true)];

    let merges = [
      {
        s: { c: 4, r: 0 },
        e: { c: 5, r: 0 },
      },
    ];

    for (let index = 0; index < 4; index++) {
      merges.push({
        s: { c: index, r: 0 },
        e: { c: index, r: 1 },
      });
    }

    let base = 2;

    users.forEach((element: any, indexbase) => {
      const template = this.getTemplateUser();
      this.userTemplate(template, element);
      if(element.user_init_roles.length){
        for (let index = 0; index < 4; index++) {
          merges.push({
            s: { c: index, r: base },
            e: { c: index, r: base + element.user_init_roles.length - 1 },
          });
        }
        base += element.user_init_roles.length;
      } else {
        finaldata.push(template);
        base += 1;
      }

      element.user_init_roles.forEach((d, index) => {
        if (index == 0) {
          template['Initiatives and Roles'] = d.initiative.official_code;
          template.init_roles = d.role;
          finaldata.push(template);
        } else {
          const template2 = this.getTemplateUser();
          template2['Initiatives and Roles'] = d.initiative.official_code;
          template2.init_roles = d.role;
          finaldata.push(template2);
        }
      });
      
    });
    return { finaldata, merges };
  }

  appendStyleForXlsx(ws: XLSX.WorkSheet) {
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "");
    const rowCount = range.e.r;
    const columnCount = range.e.c;

    for (let row = 0; row <= rowCount; row++) {
      for (let col = 0; col <= columnCount; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });

        ws[cellRef].s = {
          alignment: {
            horizontal: 'center',
            vertical: 'center',
            wrapText: true,
          },
        };


        if (row === 0 || row === 1) {
           // Format headers and names
          ws[cellRef].s = {
            ...ws[cellRef].s,
            fill: { fgColor: { rgb: '436280' } },
            font: { color: { rgb: 'ffffff' } ,  bold: true },
            alignment: {
              horizontal: 'center',
              vertical: 'center',
              wrapText: true,
            },
          };
        }
      }
    }
  }

  autofitColumnsXlsx(json: any[], worksheet: XLSX.WorkSheet, header?: string[]) {

    const jsonKeys = header ? header : Object.keys(json[0]);

    let objectMaxLength = []; 
    for (let i = 0; i < json.length; i++) {
      let objValue = json[i];
      for (let j = 0; j < jsonKeys.length; j++) {
        if (typeof objValue[jsonKeys[j]] == "number") {
          objectMaxLength[j] = 10;
        } else {
          const l = objValue[jsonKeys[j]] ? objValue[jsonKeys[j]].length + 5 : 0;

          objectMaxLength[j] = objectMaxLength[j] >= l ? objectMaxLength[j]: l;
        }
      }

      let key = jsonKeys;
      for (let j = 0; j < key.length; j++) {
        objectMaxLength[j] =
          objectMaxLength[j] >= key[j].length
            ? objectMaxLength[j]
            : key[j].length + 1; //for Flagged column
      }
    }

    const wscols = objectMaxLength.map(w => { return { width: w} });

    //row height
    worksheet['!rows'] = [];
    worksheet['!rows'].push({ //for header
      hpt: 20
     })
     worksheet['!rows'].push({ //for header
      hpt: 20
     })

    worksheet["!cols"] = wscols;
  }
}
