const axios = require('axios').default;
const fs = require('fs');
const client = require('https');
const _ = require('lodash');
const db = require('./db');
var sharp = require('sharp');
var mkdirp = require('mkdirp')
const moment = require('moment');
var schedule = require('node-schedule');
var globalFunc = require('./functions');
var Client = require('ftp');
const id_lang = 2;
const id_tax = 53;
var porcentajeAumentoSupplier = 0
var porcentajeAumentoSupplier2 = 0 
var porcentajeSupplier = 0;
const categoriasComputo = [1722,1750,2917,2921,2924,2926,2927];

let jsonCompletoOrigen = []

const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler');
const { reject } = require('lodash');
const { resolve } = require('path');
const scheduler = new ToadScheduler()

const nodemailer = require("nodemailer");

function obtenerPedidosEntregados(fecha){
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query(`SELECT * FROM ps_orders where delivery_date >= '` + fecha + `' and current_state = 5`, function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no se han podido obtener productos', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('Si hay productos entregados'); 
                        resolve(result)
                    } else {
                        console.log('No hay productos entregados');
                        resolve(false)
                    }
                }
                conn.release();
            });
        })
    });
}

function obtenerInformacionCliente(id){
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query(`SELECT id_customer, firstname, lastname, email FROM ps_customer where id_customer = `+ id + `;`, function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no se ha podido consultar la informacion del cliente', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('Si esta la informacion del cliente'); 
                        resolve(result)
                    } else {
                        console.log('No esta la informacion del cliente');
                        resolve(false)
                    }
                }
                conn.release();
            });
        })
    });
}

function obtenerFecha(){
    const fecha = new Date();
    let valor_dia = 24 * 60 * 60 * 1000;
    var ayer = new Date(fecha.getTime() - valor_dia)
    // console.log(fecha.getDate())
    // console.log(fecha.toLocaleDateString())
    // console.log(ayer)
    // let fecha_formateada = ayer.getDate() + "-" + (ayer.getMonth() + 1) + "-" + ayer.getFullYear();
    let fecha_formateada = ayer.getFullYear() + "-" + (ayer.getMonth() + 1) + "-" + ayer.getDate() + " " + ayer.getHours() + ":" + ayer.getMinutes() + ":" + ayer.getSeconds();
    // console.log(fecha_formateada)

    return fecha_formateada;
}

async function envioDeCorreo(correo, nombre){
    let email = nodemailer.createTransport({
        host: "smtp.hostinger.com",
        port: 465,
        auth: {
            user: "contacto@novusred.com",
            pass: "Contac1234@"
        },
        tls:{
            rejectUnauthorized: false
        }
    });

    let estructura = await email.sendMail({
        from: '"Contacto Novusred" <contacto@novusred.com>',
        to: correo,
        subject: "[Novusred.mx] Gracias por confiar en Novusred",
        text: "Estimad@ " + nombre + ", gracias por confiar en Novusred",
        html: '<!DOCTYPE html>'
        + '<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">'
        + '<head>'
        +  '<meta charset="utf-8">'
        +  '<meta name="viewport" content="width=device-width,initial-scale=1">'
        +  '<meta name="x-apple-disable-message-reformatting">'
        +  '<title></title>'
        +  '<!--[if mso]>'
        +  '<style>'
        +    'table {border-collapse:collapse;border-spacing:0;border:none;margin:0;}'
        +    'div, td {padding:0;}'
        +    'div {margin:0 !important;}'
        +  '</style>'
        +  '<noscript>'
        +    '<xml>'
        +      '<o:OfficeDocumentSettings>'
        +        '<o:PixelsPerInch>96</o:PixelsPerInch>'
        +      '</o:OfficeDocumentSettings>'
        +    '</xml>'
        +  '</noscript>'
        +  '<![endif]-->'
        +  '<style>'
        +    'table, td, div, h1, p {'
        +      'font-family: Arial, sans-serif;'
        +    '}'
        +    '@media screen and (max-width: 530px) {'
        +      '.unsub {'
        +        'display: block;'
        +        'padding: 8px;'
        +        'margin-top: 14px;'
        +        'border-radius: 6px;'
        +        'background-color: #555555;'
        +        'text-decoration: none !important;'
        +        'font-weight: bold;'
        +      '}'
        +      '.col-lge {'
        +        'max-width: 100% !important;'
        +      '}'
        +    '}'
        +    '@media screen and (min-width: 531px) {'
        +      '.col-sml {'
        +        'max-width: 27% !important;'
        +      '}'
        +      '.col-lge {'
        +        'max-width: 73% !important;'
        +      '}'
        +    '}'
        +  '</style>'
        +'</head>'
        +'<body style="margin:0;padding:0;word-spacing:normal;background-color:#939297;">'
        +  '<div role="article" aria-roledescription="email" lang="en" style="text-size-adjust:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background-color:#939297;">'
        +    '<table role="presentation" style="width:100%;border:none;border-spacing:0; margin-bottom: 15px; ">'
        +      '<tr>'
        +        '<td align="center" style="padding:0; background: white;">'
        +          '<!--[if mso]>'
        +          '<table role="presentation" align="center" style="width:600px;">'
        +          '<tr>'
        +          '<td>'
        +          '<![endif]-->'
        +          '<table role="presentation" style="width:94%;max-width:600px;border:none;border-spacing:0;text-align:left;font-family:Arial,sans-serif;font-size:16px;line-height:22px;color:#363636; border: 1px solid #cdcdcd; border-radius: 5px;box-shadow: 15px 11px 9px 0px #d1d1d1;">'
        +            '<tr>'
        +              '<td style="padding:40px 30px 30px 30px;text-align:center;font-size:24px;font-weight:bold;">'
        +                '<a href="https://novusred.mx" style="text-decoration:none;"><img src="https://novusred.mx/img/logo-Novusred-2022-01.png" width="320" alt="Logo" style="width:320px;max-width:80%;height:auto;border:none;text-decoration:none;color:#ffffff;"></a>'
        +              '</td>'
        +            '</tr>'
        +            '<tr>'
        +              '<td style="padding:30px;background-color:#ffffff; padding-top: 0px;">'
        +                '<h1 style="margin-top:0;margin-bottom:30px;font-size:26px;line-height:32px;font-weight:bold;letter-spacing:-0.02em; font-family: Roboto;">Estimad@ ' + nombre + ', gracias por confiar en Novusred!!!</h1>'
        +                '<p style="margin:0; font-family: Roboto; text-align: justify;">En Novusred siempre nos interesa brindarte los mejores productos y el mejor servicio, y es por ello que queremos escucharte. Déjanos una reseña en nuestro perfil de Google acerca de nuestro servicio y participa en nuestra rifa mensual para ganar grandes premios. Todas las reseñas participan mes con mes. </p>'
        +              '</td>'
        +            '</tr>'
        +            '<tr>'
        +              '<td style="padding:10px 30px 10px 30px;background-color:#ffffff;border-color:rgba(201,201,207,.35)">'
        +                '<a href="https://g.page/r/CfL8KtYVrtpmEB0/review" style="background: #007bff; text-decoration: none; padding: 10px 25px; color: #ffffff; border-radius: 4px; display: block; text-align: center;"><!--[if mso]><i style="letter-spacing: 25px;mso-font-width:-100%;mso-text-raise:20pt">&nbsp;</i><![endif]--><span style="mso-text-raise:10pt;font-weight:bold;">Dejar reseña en Google</span><!--[if mso]><i style="letter-spacing: 25px;mso-font-width:-100%">&nbsp;</i><![endif]--></a>'
        +              '</td>'
        +            '</tr>'
        +            '<tr>'
        +              '<td style="padding:30px;background-color:#ffffff;">'
        +                '<p style="margin:0; font-family: Roboto; text-align: justify;">Recuerda que entre más compras y si dejas tu reseña por compra, más posibilidades tienes de ganar.</p>'
        +                '<p style="margin:0; font-family: Roboto; text-align: justify;">Si tienes alguna duda o comentario por favor contáctanos en nuestro chat <a href="https://tawk.to/chat/5fbfd653920fc91564caffd8/1ers05adk">aquí</a> o por medio de whatsapp <a href="https://web.whatsapp.com/send?phone=529981070174&text=%F0%9F%91%8B+Hola+me+puedes+Ayudar+%F0%9F%99%82">aquí</a>.</p>'
        +              '</td>'
        +            '</tr>'
        +            '<tr>'
        +              '<td style="padding:30px;text-align:center;font-size:12px;background-color:#404040;color:#cccccc;">'
        +                '<p style="margin:0 0 8px 0;"><a href="https://www.facebook.com/novusred" style="text-decoration:none;"><img src="https://assets.codepen.io/210284/facebook_1.png" width="40" height="40" alt="f" style="display:inline-block;color:#cccccc; margin: 0px 10px;"></a> <a href="https://www.instagram.com/novusred/" style="text-decoration:none;"><img src="https://latinimpor.com/wp-content/uploads/2018/06/ICONO-INSTAGRAM-300x300.png" width="40" height="40" alt="f" style="display:inline-block;color:#cccccc; margin: 0px 10px;"></a> <a href="https://www.youtube.com/user/novusred" style="text-decoration:none;"><img src="https://mujeresinnovadoras.impi.gob.mx/PublishingImages/youtubeIcono.png" width="40" height="40" alt="t" style="display:inline-block;color:#cccccc; margin: 0px 10px;"></a></p>'
        +                '<p style="margin:0;font-size:14px;line-height:20px;">&reg; Copyright 2022 Novusred, Todos los derechos reservados.<br>La mejor tienda de tecnología<br>No es necesario responder este correo, es sólo de envío.</p>'
        +              '</td>'
        +            '</tr>'
        +          '</table>'
        +          '<!--[if mso]>'
        +          '</td>'
        +          '</tr>'
        +          '</table>'
        +          '<![endif]-->'
        +        '</td>'
        +      '</tr>'
        +    '</table>'
        +  '</div>'
        +'</body>'
        +'</html>'
    });

    console.log("Mensaje enviado", estructura.messageId)
}

async function asyncCall(){
    let indicador = obtenerFecha();
    console.log(indicador);

    var pedidos = await obtenerPedidosEntregados(indicador);
    console.log(pedidos);
    for(key in pedidos){
        console.log("Id de producto " + pedidos[key].id_order)
        console.log("Referencia " + pedidos[key].reference)
        console.log("Id de cliente " + pedidos[key].id_customer)
        console.log("Current state " + pedidos[key].current_state)
        console.log("Delivery date " + pedidos[key].delivery_date)
        var cliente = await obtenerInformacionCliente(pedidos[key].id_customer);
        console.log(cliente);
        console.log(cliente[0]['id_customer']);
        console.log(cliente[0]['firstname']);
        console.log(cliente[0]['lastname']);
        console.log(cliente[0]['email']);

        let nombre = cliente[0]['firstname'] + " " + cliente[0]['lastname'];
        await envioDeCorreo(cliente[0]['email'], nombre);
    }
}

//asyncCall();

const task = new Task('simple task' , () => {
    asyncCall() 
  })
const job = new SimpleIntervalJob({ minutes: 1440, }, task)
scheduler.addSimpleIntervalJob(job)