const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('compta')
        .setDescription('Créer la fiche comptable')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

// On utilise uniquement le bloc async/await pour plus de sécurité
(async () => {
    try {
        console.log('Début de l’enregistrement des commandes...');
        
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );
        
        console.log('Commandes enregistrées avec succès !');
    } catch (error) {
        console.error('Erreur lors du déploiement :', error);
    }
})();
