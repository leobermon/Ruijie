const axios = require('axios').default;
const _ = require('lodash')
const db = require('./db')
const moment = require('moment')
var schedule = require('node-schedule');
var globalFunc = require('./functions')
const cron_url_prod = "https://novusred.mx/modules/gsitemap/gsitemap-cron.php?token=df49a2baed&id_shop=1";
const cron_url_test = "http://3.135.93.174/modules/gsitemap/gsitemap-cron.php?token=25c26406e4&id_shop=1";
const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')
const scheduler = new ToadScheduler()
 
const nodemailer = require("nodemailer");

function insert_registro_sitemap(mensaje){
    db.getConnection((err, conn) => {
        conn.query('INSERT INTO ps_registro_sitemap(nombre, descripcion ,fecha, accion, origen ) VALUES (?,?,?,?,?)', ['Sitemap', 'Se ejecuta el CRON', moment().format('YYYY-MM-DD HH:mm:ss'), mensaje, 'EC2'], function (error, result) {
            if (err) console.log(err);
            if (error) console.log(error);
            
            conn.release();
        });
    })
}
function update_xml_sitemap(){
    console.log("Ha iniciado ...")
    return new Promise(resolve => {
        
        axios.get(cron_url_prod,{
            maxRedirects: 5000,
        })
        .then((response) => {
            console.log("se ha realizado la petición");
            if(response.status == 200){
                console.log("exito!");
                insert_registro_sitemap('Generado el xml');
                EnviarCorreo('Se ha generado con exito');

            }else{
                console.log("ha ocurrido un error");
                EnviarCorreo(error);
            }
            
        })
        .catch(function (error) {
            // console.log(error);
            EnviarCorreo('Ha ocurrido un error');
            insert_registro_sitemap('Ha ocurrido un error');
            console.log("error")
        });
        
    });

}



async function EnviarCorreo(mensaje) {
    // Generate test SMTP service account from ethereal.email
    // Only needed if you don't have a real mail account for testing
    let testAccount = await nodemailer.createTestAccount();
  
    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport({
        host: "mail.novusred.com",
        port: 26,
        auth: {
          user: "contacto@novusred.com",
          pass: "Novusred2020*"
        },
        tls: {
            rejectUnauthorized: false
        }
      });
  
    // send mail with defined transport object
    let info = await transporter.sendMail({
      from: '"Correo" <contacto@novusred.com>', // sender address
      to: "desarrollo@novusred.com, michel.andrade@novusred.com", // list of receivers
      subject: "Saludos "+moment().format('YYYY-MM-DD HH:mm:ss'), // Subject line
      text: mensaje, // plain text body
      html: "<b>"+mensaje+"</b>", // html body
    });
  
    console.log("Message sent: %s", info.messageId);

  }
  
const task = new Task('simple task' , () => {
    update_xml_sitemap() 
    //globalFunc.insertRegistro('UpdateSyscom2')
  })
const job = new SimpleIntervalJob({ minutes: 1440, }, task)
scheduler.addSimpleIntervalJob(job)
// update_xml_sitemap() 