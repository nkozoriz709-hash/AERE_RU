// ============================================
// JSONBin API - Единый интерфейс для всех данных
// ============================================

const JSONBIN_API_KEY = '$2a$10$YXfbuwQuOthOnCbHadJ75OyTetnutOeB.VTMH2BYysqk9vaRa5f6S';
const JSONBIN_BIN_ID = '6a85beaeda38895dfef76375';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

class JSONBinAPI {
    static async getData() {
        try {
            const response = await fetch(JSONBIN_URL + '/latest', {
                headers: {
                    'X-Master-Key': JSONBIN_API_KEY
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.record || {};
        } catch (error) {
            console.error('❌ Ошибка загрузки данных из JSONBin:', error);
            return null;
        }
    }

    static async updateData(data) {
        try {
            if (typeof data !== 'object' || data === null) {
                throw new Error('Данные должны быть объектом');
            }
            
            const cleanData = {
                products: Array.isArray(data.products) ? data.products : [],
                users: Array.isArray(data.users) ? data.users : [],
                orders: Array.isArray(data.orders) ? data.orders : [],
                partners: Array.isArray(data.partners) ? data.partners : [],
                notifications: Array.isArray(data.notifications) ? data.notifications : []
            };
            
            const response = await fetch(JSONBIN_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Master-Key': JSONBIN_API_KEY
                },
                body: JSON.stringify(cleanData)
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            }
            const result = await response.json();
            console.log('✅ Данные обновлены в JSONBin');
            return result;
        } catch (error) {
            console.error('❌ Ошибка обновления данных в JSONBin:', error);
            return null;
        }
    }

    static async syncProducts(products) {
        const data = await this.getData() || {};
        data.products = Array.isArray(products) ? products : [];
        return this.updateData(data);
    }

    static async syncUsers(users) {
        const data = await this.getData() || {};
        data.users = Array.isArray(users) ? users : [];
        return this.updateData(data);
    }

    static async syncOrders(orders) {
        const data = await this.getData() || {};
        data.orders = Array.isArray(orders) ? orders : [];
        return this.updateData(data);
    }

    static async syncPartners(partners) {
        const data = await this.getData() || {};
        data.partners = Array.isArray(partners) ? partners : [];
        return this.updateData(data);
    }

    static async syncNotifications(notifications) {
        const data = await this.getData() || {};
        data.notifications = Array.isArray(notifications) ? notifications : [];
        return this.updateData(data);
    }

    static async syncAll(products, users, orders, partners, notifications) {
        const data = {
            products: Array.isArray(products) ? products : [],
            users: Array.isArray(users) ? users : [],
            orders: Array.isArray(orders) ? orders : [],
            partners: Array.isArray(partners) ? partners : [],
            notifications: Array.isArray(notifications) ? notifications : []
        };
        return this.updateData(data);
    }
}