/**
 * @author Luuxis
 * @license CC-BY-NC 4.0 - https://creativecommons.org/licenses/by-nc/4.0
 */

const pkg = require('../package.json');
const nodeFetch = require("node-fetch");
const { machineIdSync } = require("node-machine-id");
const convert = require('xml-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');
const hwid = machineIdSync();
import { getConfig, getLauncherKey, getCurrentLauncherUrl } from '../MKLib.js';

let key;

/**
 * Construye una URL basada en el launcher seleccionado usando MKLib
 * @param {string} endpoint - Endpoint de la API
 * @returns {Promise<string>} URL completa
 */
async function buildUrl(endpoint) {
    try {
        const currentUrl = await getCurrentLauncherUrl();
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        return `${currentUrl}/${cleanEndpoint}`;
    } catch (error) {
        console.error('Error building URL:', error);
        // Fallback a pkg.url si hay error
        const url = pkg.user ? `${pkg.url}/${pkg.user}` : pkg.url;
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        return `${url}/${cleanEndpoint}`;
    }
}

// Función local getLauncherKey para compatibilidad hacia atrás con getInstanceList
async function getLocalLauncherKey() {
    try {
        // Usar la función protegida de MKLib en lugar de implementación local
        return await getLauncherKey();
    } catch (error) {
        console.warn('Error getting launcher key from MKLib, using fallback:', error);
        // Fallback a la implementación local si falla MKLib
        if (!key) {
            const files = [
                path.join(__dirname, '../package.json'),
                ...fs.readdirSync(__dirname).filter(file => file.endsWith('.js')).map(file => path.join(__dirname, file))
            ];

            const hash = crypto.createHash('sha256');
            for (const file of files) {
                const data = fs.readFileSync(file);
                hash.update(data);
            }
            key = hash.digest('hex');
        }
        return key;
    }
}

class Config {
    async GetConfig() {
        // Use the new protected function from MKLib.js
        return getConfig();
    }

    async getInstanceList() {
        try {
            // Usar la función actualizada para obtener la clave del launcher
            const launcherKey = await getLocalLauncherKey();
            const baseUrl = await buildUrl('files');
            let urlInstance = `${baseUrl}?checksum=${launcherKey}&id=${hwid}`;
            
            let response = await nodeFetch(urlInstance, {
                headers: {
                    'User-Agent': 'MiguelkiNetworkMCLauncher'
                }
            });
            
            // Check if the response is OK
            if (!response.ok) {
                console.error(`Server returned status: ${response.status} ${response.statusText}`);
                return [];
            }
            
            let instances = await response.json();
            
            if (!instances || typeof instances !== 'object') {
                console.error("Invalid instance data received:", instances);
                return [];
            }
            
            let instancesList = [];
            instances = Object.entries(instances);

            for (let [name, data] of instances) {
                if (data) {
                    let instance = data;
                    instance.name = name;
                    instancesList.push(instance);
                }
            }
            return instancesList;
        } catch (err) {
            console.error("Error fetching instance list:", err);
            return [];
        }
    }

    async getNews() {
        let config = await this.GetConfig() || {}

        if (config.rss) {
            return new Promise((resolve, reject) => {
                nodeFetch(config.rss).then(async config => {
                    if (config.status === 200) {
                        let news = [];
                        let response = await config.text()
                        response = (JSON.parse(convert.xml2json(response, { compact: true })))?.rss?.channel?.item;

                        if (!Array.isArray(response)) response = [response];
                        for (let item of response) {
                            news.push({
                                title: item.title._text,
                                content: item['content:encoded']._text,
                                author: item['dc:creator']._text,
                                publish_date: item.pubDate._text
                            })
                        }
                        return resolve(news);
                    }
                    else return reject({ error: { code: config.statusText, message: 'server not accessible' } });
                }).catch(error => reject({ error }))
            })
        } else {
            return new Promise(async (resolve, reject) => {
                try {
                    const newsUrl = await buildUrl('launcher/news-launcher/news.json');
                    nodeFetch(newsUrl, {
                        headers: {
                            'User-Agent': 'MiguelkiNetworkMCLauncher'
                        }
                    }).then(async config => {
                        if (config.status === 200) return resolve(config.json());
                        else return reject({ error: { code: config.statusText, message: 'server not accessible' } });
                    }).catch(error => {
                        return reject({ error });
                    });
                } catch (error) {
                    return reject({ error });
                }
            });
        }
    }
}

export default new Config;