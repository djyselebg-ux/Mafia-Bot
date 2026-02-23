const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    REST,
    Routes
} = require('discord.js');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// --- CONFIGURATION ---
const ROLE_COMPTA_ID = "1475156397187661987";
const accounts = {};
const waitingPhoto = new Map();

const TARIFS = {
    "Saphir": 12000, "Emeraude": 13000, "Rubis": 13500, "Diamant": 15000,
    "Lingot d'or": 16000, "Mant précieux": 75000, "Montre gousset": 1250,
    "Montre en or": 1850, "Collier perle": 2500, "Collier saphir": 55500,
    "Cigarette contrebande": 400, "Alcool contrebande": 400
};

// --- INTERFACE BOUTONS (Go Fast supprimé) ---
const getButtons = () => [
    new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_argent_sale').setLabel('💸 Argent Sale').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('btn_brique_weed').setLabel('🌿 Brique Weed').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('btn_pochon_weed').setLabel('🍃 Pochon Weed').setStyle(ButtonStyle.Success)
    ),
    new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_speedo_acide').setLabel('🧪 Speedo Acide').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_recel').setLabel('💰 Recel').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('btn_conteneur').setLabel('📦 Conteneur').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('btn_modifier').setLabel('🛠️ MODIFIER').setStyle(ButtonStyle.Secondary)
    )
];

// --- GENERATION DE L'EMBED ---
function generateEmbed(cid) {
    const data = accounts[cid];
    let total = 0;
    let details = "";

    data.details.forEach((item) => {
        if (item.type === 'conteneur') {
            const p = (TARIFS[item.nom] || 0) * item.qty;
            const lienPhoto = item.photo ? ` — [**Preuve 🖼️**](${item.photo})` : "";
            details += `📦 **${item.qty_cont} Boîte(s)** (${item.qty}x ${item.nom})${lienPhoto} : \`${p}$\`\n`;
            total += p;
        } else {
            const em = { argent_sale: '💸', brique_weed: '🌿', pochon_weed: '🍃', speedo_acide: '🧪', recel: '💰' };
            details += `${em[item.type] || '🔹'} **${item.type.toUpperCase().replace('_', ' ')}** : \`${item.montant}$\`\n`;
            total += item.montant;
        }
    });

    return new EmbedBuilder()
        .setColor('#2b2d31')
        .setTitle(`💼 SESSION : ${data.nom_orga.toUpperCase()}`)
        .setDescription(`━━━━━━━━━━━━━━━━━━━━━━━━━━\n${details || "*Aucune donnée enregistrée*"}\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n💰 **TOTAL : ${total}$**\n━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        .setFooter({ text: "Les Rejetés - Cliquez sur 'Preuve' pour voir l'image" });
}

// --- LOGIQUE PHOTO ---
client.on('messageCreate', async message => {
    if (message.author.bot || !waitingPhoto.has(message.author.id)) return;

    const cid = message.channel.id;
    if (message.attachments.size > 0) {
        const temp = waitingPhoto.get(message.author.id);
        accounts[cid].details.push({ 
            type: 'conteneur', 
            qty_cont: temp.nb, 
            nom: temp.nom, 
            qty: temp.qty, 
            photo: message.attachments.first().url 
        });

        waitingPhoto.delete(message.author.id);
        await message.delete().catch(() => {}); 

        const main = (await message.channel.messages.fetch({ limit: 10 })).find(m => m.embeds[0]?.title?.includes("SESSION :"));
        if (main) await main.edit({ embeds: [generateEmbed(cid)], components: getButtons() });
    }
});

// --- INTERACTIONS ---
client.on('interactionCreate', async i => {
    if (!i.member.roles.cache.has(ROLE_COMPTA_ID)) return i.reply({ content: "❌ Accès refusé.", ephemeral: true });
    const cid = i.channel.id;

    if (i.isChatInputCommand() && i.commandName === 'panel') {
        accounts[cid] = { nom_orga: i.member.displayName, details: [] };
        return i.reply({ embeds: [generateEmbed(cid)], components: getButtons() });
    }

    if (i.isButton()) {
        if (i.customId === 'btn_conteneur') {
            const m = new ModalBuilder().setCustomId('modal_cont').setTitle('📦 Conteneur');
            m.addComponents(
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nb').setLabel('Nombre de boîtes').setStyle(TextInputStyle.Short).setValue("1")),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nom').setLabel('Objet').setStyle(TextInputStyle.Short)),
                new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('qty').setLabel('Quantité').setStyle(TextInputStyle.Short).setValue("1"))
            );
            return await i.showModal(m);
        }

        if (i.customId === 'btn_modifier') {
            const data = accounts[cid];
            if (!data?.details.length) return i.reply({ content: "Aucune saisie à modifier.", ephemeral: true });
            const btns = data.details.slice(-4).reverse().map((d) => new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`del_${data.details.indexOf(d)}`).setLabel(`Suppr. ${d.nom || d.type}`).setStyle(ButtonStyle.Danger)));
            return i.reply({ content: "🛠️ Quel élément souhaitez-vous supprimer ?", components: btns, ephemeral: true });
        }

        if (i.customId.startsWith('del_')) {
            const idx = parseInt(i.customId.split('_')[1]);
            accounts[cid].details.splice(idx, 1);
            await i.update({ content: "✅ Saisie supprimée.", components: [], ephemeral: true });
            const main = (await i.channel.messages.fetch({ limit: 10 })).find(m => m.embeds[0]?.title?.includes("SESSION :"));
            if (main) await main.edit({ embeds: [generateEmbed(cid)], components: getButtons() });
            return;
        }

        const cat = i.customId.replace('btn_', '');
        if (['argent_sale', 'brique_weed', 'pochon_weed', 'speedo_acide', 'recel'].includes(cat)) {
            const m = new ModalBuilder().setCustomId(`modal_${cat}`).setTitle(`Saisie ${cat.replace('_', ' ')}`);
            m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('arg').setLabel('Montant total ($)').setStyle(TextInputStyle.Short)));
            return await i.showModal(m);
        }
    }

    if (i.isModalSubmit()) {
        if (i.customId === 'modal_cont') {
            const inputNom = i.fields.getTextInputValue('nom').trim();
            const rawNom = Object.keys(TARIFS).find(k => k.toLowerCase() === inputNom.toLowerCase()) || inputNom;
            
            waitingPhoto.set(i.user.id, { 
                nb: i.fields.getTextInputValue('nb'), 
                nom: rawNom, 
                qty: i.fields.getTextInputValue('qty') 
            });
            return i.reply({ content: "📸 **Envoie la photo du loot maintenant dans ce salon.**", ephemeral: true });
        }
        const cat = i.customId.replace('modal_', '');
        accounts[cid].details.push({ type: cat, montant: parseInt(i.fields.getTextInputValue('arg')) || 0 });
        return await i.update({ embeds: [generateEmbed(cid)], components: getButtons() });
    }
});

client.login(process.env.TOKEN);
