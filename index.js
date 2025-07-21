require('dotenv').config();
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');

const horarios = ['08:00', '12:00', '13:00', '18:00'];
let ultimosLogins = {}; 

function registrarLog(mensagem) {
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const logFinal = `[${dataFormatada} - ${horaFormatada}] ${mensagem}\n`;
    console.log(logFinal.trim());

    fs.appendFileSync('logs.txt', logFinal);
}

async function login() {
    const { EMAIL, SENHA } = process.env;

    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        await page.goto('https://login.tron.com.br/#/login');

        await page.type('input[name="usuario"]', EMAIL);
        await page.type('input[name="senha"]', SENHA);

        const button = await page.$('.btn-tron');
        await button.click();

        await page.waitForSelector('.btn-tron-app');
        const buttonApp = await page.$('.btn-tron-app');
        await buttonApp.click();

        await page.waitForSelector('.nav-header');
        const buttonNav = await page.$('.nav-header');
        await buttonNav.click();

        await page.goto('https://connect.tron.com.br/#/batida-remota');

        await page.waitForSelector('.ant-btn-primary');
        const buttonpt = await page.$('.ant-btn-primary');
        await buttonpt.click();

        await page.waitForSelector('.swal-button--Confirmar');
        const buttonConfirmar = await page.$('.swal-button--Confirmar');
        await buttonConfirmar.click();

        setTimeout(async () => {
            await browser.close();
        }, 10000);

        const agora = new Date();
        const data = agora.toLocaleDateString('pt-BR');
        const hora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        registrarLog(`Ponto batido em ${data} - ${hora}`);
    } catch (error) {
        registrarLog(`Falha em bater ponto: ${error.message}`);
    }
}

async function checarHorario() {
    try {
        const res = await axios.get('http://worldtimeapi.org/api/timezone/America/Sao_Paulo');
        const dataHora = res.data.datetime;
        const [data, horaCompleta] = dataHora.split('T');
        const horaMinuto = horaCompleta.slice(0, 5);

        if (horarios.includes(horaMinuto)) {
            if (ultimosLogins[horaMinuto] !== data) {
                ultimosLogins[horaMinuto] = data;
                await login();
            }
        }
    } catch (error) {
        registrarLog(`Erro ao checar horário: ${error.message}`);
    }
}

setInterval(checarHorario, 60 * 1000);
checarHorario();
