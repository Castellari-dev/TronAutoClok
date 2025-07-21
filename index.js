require('dotenv').config();
const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');

// Intervalos de horários (início e fim em minutos)
const intervalosHorarios = [
    { inicio: '08:00', fim: '08:10' },
    { inicio: '12:00', fim: '12:10' },
    { inicio: '13:00', fim: '13:10' },
    { inicio: '18:00', fim: '18:10' }
];

let ultimosLogins = {};
let horariosAleatorioDoDia = {};

function registrarLog(mensagem) {
    const agora = new Date();
    const dataFormatada = agora.toLocaleDateString('pt-BR');
    const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const logFinal = `[${dataFormatada} - ${horaFormatada}] ${mensagem}\n`;
    console.log(logFinal.trim());
    fs.appendFileSync('logs.txt', logFinal);
}

function gerarHorarioAleatorio(horaInicio, horaFim) {
    const [horaIni, minIni] = horaInicio.split(':').map(Number);
    const [horaFi, minFi] = horaFim.split(':').map(Number);
    
    const minutosInicio = horaIni * 60 + minIni;
    const minutosFim = horaFi * 60 + minFi;
    
    const minutosAleatorios = Math.floor(Math.random() * (minutosFim - minutosInicio + 1)) + minutosInicio;
    
    const hora = Math.floor(minutosAleatorios / 60);
    const minuto = minutosAleatorios % 60;
    
    return `${hora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
}

function gerarHorariosDoDia(data) {
    if (horariosAleatorioDoDia[data]) {
        return horariosAleatorioDoDia[data];
    }
    
    const horariosGerados = intervalosHorarios.map(intervalo => 
        gerarHorarioAleatorio(intervalo.inicio, intervalo.fim)
    );
    
    horariosAleatorioDoDia[data] = horariosGerados;
    
    registrarLog(`Horários gerados para ${data}: ${horariosGerados.join(', ')}`);
    
    return horariosGerados;
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
        
        // Gera os horários aleatórios do dia se ainda não foram gerados
        const horariosAleatorios = gerarHorariosDoDia(data);
        
        // Verifica se o horário atual coincide com algum dos horários aleatórios
        if (horariosAleatorios.includes(horaMinuto)) {
            if (ultimosLogins[horaMinuto] !== data) {
                ultimosLogins[horaMinuto] = data;
                registrarLog(`Horário de ponto detectado: ${horaMinuto}`);
                await login();
            }
        }
    } catch (error) {
        registrarLog(`Erro ao checar horário: ${error.message}`);
    }
}

// Executa a cada minuto
setInterval(checarHorario, 60 * 1000);
checarHorario();

registrarLog('Sistema de ponto com horários aleatórios iniciado');