import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Email } from 'src/entities/email.entity';
import { Variable } from 'src/entities/variable.entity';
import { Repository } from 'typeorm';
import * as sgMail from '@sendgrid/mail';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class EmailService {
    constructor(@InjectRepository(Email) public repo: Repository<Email>,
    @InjectRepository(Variable) public variableRepo: Repository<Variable>,
    ){}
    private readonly logger = new Logger(EmailService.name);

    private async sendMailCostume(to, html, label) {
      const msg = {
        to,
        from: { name: 'CGIAR Planning', email: 'noreply@planning.cgiar.org' },
        html: html,
        subject: label,
        text: html.replace(/(<([^>]+)>)/gi, ''),
      };
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      return await sgMail.send(msg).catch((e) => { console.log(e); return  false});
    }


    async getEmailsByStatus(status: boolean) {
      if (status == null) {
        var emaillogs = await this.repo.createQueryBuilder('e').getMany();
        return emaillogs;
      } else {
        var emaillogs = await this.repo
          .createQueryBuilder('e')
          .where({ status: Boolean(status) })
          .getMany();
        return emaillogs;
      }
    }





    async send(email: Email) {
      if (Boolean(parseInt(process.env.CAN_SEND_EMAIL))) {
        let sendGridStatus = await this.sendMailCostume(
          email.email,
          email.email_body,
          email.subject,
        );
        if (sendGridStatus) this.repo.update(email.id, { status: true });
      } else {
        this.repo.update(email.id, { status: true });
      }
    }




    @Cron(CronExpression.EVERY_30_SECONDS, {
      name: 'email-notifications',
    })
    private async sendEmailNotifications() {
      this.logger.log('Email Notifications Runing');
      let emails = await this.getEmailsByStatus(false);
      if (emails.length <= 10)
        emails.forEach(async (email) => {
          await this.send(email);
        });
    }





    async createEmail(
      name: string,
      subject: string,
      email: string,
      body: string,
    ) {

      const newEmail = this.repo.create();
      newEmail.name = name;
      newEmail.subject = subject;
      newEmail.email = email;
      newEmail.email_body = body;
  
      return await this.repo.save(newEmail);
    }


    emailTemplate(body: string) {
        return `
        
        <div style="height: 800px; background-color: #f7f7f7">
        <div style="height: 150px; background-color: rgb(67, 98, 128)">
            <img width="50" alt="CGIAR" style="margin: 30px; margin-bottom:0px" src="https://www.cgiar.org/wp/wp-content/themes/cgiar/assets/images/logo_white-9a4b0e50b1.png">
            <h2 style="margin: 0px; height: 48px; display: inline; position: absolute;color: white;top: 46px;"><b>CGIAR</b> Planning</h2>
            <div style="height: 60px; width: 70%; margin: auto; background-color: #fff; border-top-left-radius: 10px; border-top-right-radius: 10px;">
                <h2 style="color: rgb(67, 98, 128); letter-spacing: 2px; margin: 0 auto;text-align: center; margin-top: 15px; border-bottom: 1px solid #ebeae8; width: 70%; padding: 11px;">Notification</h2>
            </div>
        </div>
        <div style="width: 70%; margin: auto; background-color: #fff; border-bottom-left-radius: 10px; border-bottom-right-radius: 10px;">
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
            <tr>
                <td align="center">
                    <div style="margin-top: 50px; width: 85%; padding-bottom: 30px;">
                    ${body}
                    </div>
                </td>
            </tr>
            </table>
        </div>
                `;
      }









      async createEmailBy(user,variable, init, roleAssigned, statusReason, organization, userRoleDoAction, otherInitiative, meliaStudy) {

        let body = `<p style="font-weight: 200"> Dear ${user.full_name}</p>`;
        try {
          switch(variable.id) {
            case 1:
              // Role assigned Coordinator || Contributor
              body += this.createBodyForCoordinatorAndContributorAssigned(init, roleAssigned)
              break;
            case 2:
              // Role assigned Leader
              body += this.createBodyForLeaderAssigned(init, roleAssigned)
              break;
            case 3:
              // Initiative PORB to be Validated for (admins)
              body += this.createBodyForAdminsToBeValidated(init)
              break;
            case 4:
              // Initiative/Platform submitted for (Leader && Coordinator)
              body += this.createBodyForLeaderAndCoordinatorToBeValidated(init)
              break;
            case 5:
              // Initiative PORB is validated
              body += this.createBodyForApprovedSubmission(init, roleAssigned, statusReason)
              break;
            case 6:
              // Initiative PORB is rejected
              body += this.createBodyForRejectedSubmission(init, roleAssigned, statusReason)
              break;
            case 7:
              // PORB completed
              body += this.createBodyForPORBCompleted(init, organization, userRoleDoAction)
              break;
            case 8:
              // Collaborating Initiative for MELIA studies/activities
              body += this.createBodyForPORBCollaboratingInitiativeMELIA(init, otherInitiative, meliaStudy)
              break;
          }
    
          const emailBody = this.emailTemplate(body);


          const email = await this.createEmail(user.full_name, variable.label, user.email, emailBody);
    
          return email;
        } catch (error) {
          console.error(error);
        }
      }



    async sendEmailTobyVarabel(user, variable_id, init, roleAssigned, statusReason, organization, userRoleDoAction, otherInitiative, meliaStudy) {
      const variable = await this.variableRepo.findOne({where: {id: variable_id}})
    
      return await this.createEmailBy(
        user,
        variable,
        init,
        roleAssigned,
        statusReason,
        organization,
        userRoleDoAction,
        otherInitiative,
        meliaStudy
      );
    }






    createBodyForCoordinatorAndContributorAssigned(init, roleAssigned) {
    return `
    	<p style="font-weight: 200">
        You have been assigned the ${roleAssigned} role for Initiative/Platform <span style="font-weight: bold;">${init.official_code}</span>
      </p>
    `
  }

  createBodyForLeaderAssigned(init, roleAssigned) {
    return `
    	<p style="font-weight: 200">
        You have been assigned by the admin as the ${roleAssigned} role for Intiative/Platform <span style="font-weight: bold;">${init.official_code}</span>
      </p>
    `
  }



  createBodyForAdminsToBeValidated(init) {
    return `
    	<p style="font-weight: 200">
        The PORB for Initiative <span style="font-weight: bold;">${init.official_code}</span> is waiting for your approval.
      </p>
    `
  }



  createBodyForLeaderAndCoordinatorToBeValidated(init) {
    return `
    	<p style="font-weight: 200">
        Initiative/Platform <span style="font-weight: bold;">${init.official_code}</span> was submitted for approval
      </p>
    `
  }


  createBodyForApprovedSubmission(init, roleAssigned, statusReason) {

    let emailBody = `
    <p style="font-weight: 200">
      The PORB for your Initiative <span style="font-weight: bold;">${init.official_code}</span> of which you are ${roleAssigned} has been approved
    </p>
    `
    if(statusReason)
      emailBody += `
      <p style="font-weight: 200">
        <span style="font-weight: bold; display: block;">Reason for approval: </span>
        ${statusReason}
      </p>
      `
    return emailBody
  }


  createBodyForRejectedSubmission(init, roleAssigned, statusReason) {
    let emailBody = `
    <p style="font-weight: 200">
      The PORB for your Initiative <span style="font-weight: bold;">${init.official_code}</span> of which you are ${roleAssigned} has been rejected
    </p>
    `
    if(statusReason)
      emailBody += `
      <p style="font-weight: 200">
        <span style="font-weight: bold; display: block;">Reason for rejected: </span>
        ${statusReason}
      </p>
      `
    return emailBody
  }




  createBodyForPORBCompleted(init, organization, userRoleDoAction) {
    if(userRoleDoAction[0].user) {
      return `
    	<p style="font-weight: 200">
        PORB ${organization.acronym} was <span style="font-weight: bold;">completed</span> by ${userRoleDoAction[0].role} ${userRoleDoAction[0].user.full_name} <span style="font-weight: bold;">${init.official_code}</span>
      </p>
    `
    } else {
      return `
    	<p style="font-weight: 200">
        PORB ${organization.acronym} was <span style="font-weight: bold;">completed</span> by ${userRoleDoAction[0].role} ${userRoleDoAction[0].full_name} <span style="font-weight: bold;">${init.official_code}</span>
      </p>
    `
    } 
  }


  createBodyForPORBCollaboratingInitiativeMELIA(init, otherInitiative, meliaStudy) {
    return `
    	<p style="font-weight: 200">
        The   Initiative/Platform <span style="font-weight: bold;">${otherInitiative.official_code}</span> was added by Initiative/Platform <span style="font-weight: bold;">${init.official_code}</span> as collaborating  to conduct the MELIA studies   <span style="font-weight: bold;"> ${meliaStudy.name}  </span> 
      </p>
    `
  }
}
