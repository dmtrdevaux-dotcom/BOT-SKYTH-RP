const { ActivityType } = require("discord.js");

module.exports = {

    name: "ready",
    once: true,

    async execute(client) {

        console.clear();

        console.log(`Connecté en tant que ${client.user.tag}`);

        if (client.user.username !== "DeeZzy Bot") {
            await client.user.setUsername("DeeZzy Bot");
            console.log(`Nom changé en DeeZzy Bot`);
        }

        const guild = client.guilds.cache.get("1521105635482144809");

        const updatePresence = async () => {

            await guild.members.fetch();

            const members = guild.memberCount.toLocaleString("fr-FR");

            client.user.setPresence({

                status: "online",

                activities: [
                    {
                        name: `${members} membres`,
                        type: ActivityType.Streaming,
                        url: "https://twitch.tv/mgaesport"
                    }
                ]

            });

        };

        await updatePresence();

        setInterval(updatePresence, 5 * 60 * 1000);

    }

};
