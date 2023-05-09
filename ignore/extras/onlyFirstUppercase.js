const axios = require('axios').default;
const _ = require('lodash')
const db = require('./db')
const moment = require('moment')
var schedule = require('node-schedule');
var globalFunc = require('./functions')

const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')
const scheduler = new ToadScheduler()
let products = {};

function get_products() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos
            query = `
            SELECT p.id_product, p.reference ,pd.nombre, pd.model,pd.marca, pl.name, pl.link_rewrite, pl.meta_description, pl.meta_title FROM ps_product p 
            inner join ps_producto_detalles pd on pd.product_id = p.id_product
            left join ps_product_lang pl on pl.id_product = p.id_product
            order by p.id_product asc limit 1000
            ;`;
            conn.query(query, function (err, result) {
                if (err) {
                    resolve({ok:false, mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos - obtener get_products'); 
                        resolve(
                                {
                                    ok:true, 
                                    mensaje: 'Se han encontrado productos', 
                                    data: result 
                                }
                            );

                    } else {
                        console.log('no hay datos - obtener get_products');
                        resolve({ok:false, mensaje: 'error, no data DB', data: {} });
                    }
                }
                conn.release();
            });
        })
    });
}

//función para actualizar la información del producto
function update_product(sql){
    console.log("ingreso a actualziar")
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query(sql, function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                resolve({ mensaje: 'ok', data: result })
                conn.release();
            });
        })
    })
}

// const cap = str => str.charAt(0).toUpperCase() + str.slice(1);
// const movieTitleFormatter = (title = '') => {
//   const exludeWords = ['de', 'the']
//   return cap(
//     title.replace(/\b\w+\b/g, m => exludeWords.includes(m) ? m : cap(m))
    
//   );
// }
// const cap = str => str.charAt(0).toUpperCase() + str.slice(1);
// const movieTitleFormatter = (title = '') => {
//     const exludeWords = [
//         'a',
//         'sobre',
//         'encima',
//         'después',
//         'nuevamente',
//         'contra',
//         'todo',
//         'soy',
//         'un',
//         'y',
//         'ninguno',
//         'son',
//         'no',
//         'cuando',
//         'en',
//         'estar',
//         'porque',
//         'sido',
//         'antes',
//         'siendo',
//         'debajo',
//         'entre',
//         'ambos',
//         'pero',
//         'por',
//         'puede',
//         'podía',
//         'hizo',
//         'hacer',
//         'hace',
//         'haciendo',
//         'bajo',
//         'durante',
//         'cada',
//         'alguno',
//         'para',
//         'desde',
//         'más',
//         'tuvo',
//         'tiene',
//         'haber',
//         'habiendo',
//         'él',
//         'aquí',
//         'suyo',
//         'misma',
//         'su',
//         'mismo',
//         'cómo',
//         'si',
//         'en',
//         'dentro',
//         'es',
//         'eso',
//         'dejar',
//         'me',
//         'mayoría',
//         'mi',
//         'mismo',
//         'ni',
//         'desactivado',
//         'activado',
//         'solo',
//         'o',
//         'otro',
//         'nuestro',
//         'nuestros',
//         'mismos',
//         'fuera',
//         'propio',
//         'mismo',
//         'ella',
//         'debería',
//         'tal',
//         'que',
//         'el',
//         'sus',
//         'entonces',
//         'allí',
//         'estos',
//         'ellos',
//         'esos',
//         'aquellos',
//         'través',
//         'demasiado',
//         'hasta',
//         'arriba',
//         'muy',
//         'era',
//         'éramos',
//         'qué',
//         'cuándo',
//         'dónde',
//         'mientras',
//         'quién',
//         'con',
//     ]
//     // return cap(
//     //     // title.replace(/(^|\s)[a-z\u00E0-\u00FC]/g, m => exludeWords.includes(m) ? m : cap(m))
//     //     title.replace(/(^|\s)\S/g, function(match) {
//     //         return exludeWords.includes(match) ? match : match.toUpperCase()
//     //         // return match.toUpperCase();
//     //     })
//     // );
//     return cap(
//         title.replace(/\b\w+\b/g, m => exludeWords.includes(m) ? m : cap(m))
//       );
// }

async function init(){
    valid = false;
    
    let resp_products = await get_products();
    let listaToUpdate = '';
    let countProductsUpdate = 1;

    console.log(resp_products);

    if(resp_products['ok'] && resp_products['data']){
        for (key in resp_products['data']) {
            let product_name = resp_products['data'][key]['name'];
            let stringLowerCase = product_name.toLocaleLowerCase();
            let stringUpperCase = stringLowerCase
            .split(/ /g).map(word =>
                `${word.substring(0,1).toUpperCase()}${word.substring(1)}`)
            .join(" ");
            console.log(stringUpperCase);
            /*
            console.log(resp_products['data'][key]['id_product']);
            listaToUpdate = `UPDATE ps_product_lang SET name = '${stringUpperCase}' WHERE id_product = '${resp_products['data'][key]['id_product']}' and id_shop = '1' and id_lang = '2';`
            await update_product(listaToUpdate);
            */
        }
    }
    await update_product(listaToUpdate);
    console.log("finalizado");

}


async function prueba(){
    valid = false;
    
    // let resp_products = await get_products();
    let listaToUpdate = '';
    let countProductsUpdate = 1;

    // console.log(resp_products);

    let product_name = 'Dahua tpcbf1241nd3f4 cámara ip bullet térmica hibrida/ wizsense/ resolución de imagen térmica 256x192/ lente térmico de 7mm/ le';
    let stringLowerCase = product_name.toLocaleLowerCase();
    let stringUpperCase = stringLowerCase
    .split(/ /g).map(word =>
        `${word.substring(0,1).toUpperCase()}${word.substring(1)}`)
    .join(" ");
    
    console.log(stringUpperCase);

    console.log("finalizado");

}
init();


