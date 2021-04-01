const { Client, RichEmbed } = require("discord.js");
const fs = require("fs");

const follow = require("./services/follow");
const subscribe = require("./services/subscribe");

const config = require("./config.json");
const tokens = require("./tokens.json");

const txtToArray = async (path) => {
  try {
    const array = await fs.promises
      .readFile(path)
      .then(buffer => buffer
        .toString()
        .trim()
        .split(/\r?\n|\r/g)
        .filter(el => el.length > 0)
      );

    return Promise.resolve(array);
  } catch (error) {
    return Promise.reject(error);
  }
}

const client = new Client();

client.on("ready", () => console.log(`Working on ${client.user.tag}`));

client.on("message", async (message) => {
  if (!message.guild) return;
  if (!message.content.startsWith(config.prefix)) return;

  const [command, ...args] = message.content.slice(config.prefix.length).trim().split(/ +/g);

  if (!tokens[message.author.id]) {
    tokens[message.author.id] = {
      tokens: 0
    };
  }
  
  if (command === "add") {
    if (message.author.id !== config.userid) return message.reply("you can't use this command!");

    const [key, tokensToAdd] = args;

    if (!key) return message.reply("you must provide a key!");
    if (!tokensToAdd) return message.reply("you must provide the tokens for this key!");
    if (isNaN(tokensToAdd)) return message.reply("the tokens to add must be an integer!");

    try {
      const exists = await fs.promises.readFile(`./keys/${key}.json`).catch(() => false);
      if (exists) return message.reply(`\`${key}\` already exists!`);

      await fs.promises.writeFile(`./keys/${key}.json`, tokensToAdd);
    } catch (error) {
      throw error;
    }

    message.channel.send(
      new RichEmbed()
        .setAuthor("Key created!", message.author.avatarURL)
        .setColor("GREEN")
        .addField("Key", key, true)
        .addField("Tokens", tokensToAdd, true)
    )
  } else if (command === "redeem") {
    message.delete().catch(() => void 0);

    const [key] = args;
    if (!key) return message.reply("you must provide a key!");

    try {
      const tokensFromKey = await fs.promises
        .readFile(`./keys/${key}.json`)
        .then(buffer => Number(buffer.toString().trim()))
        .catch(() => null);

      if (!tokensFromKey) return message.reply(`\`${key}\` is an invalid key!`);
      if (!tokens[message.author.id]) tokens[message.author.id] = { tokens: 25 };

      tokens[message.author.id].tokens += tokensFromKey;

      message.channel.send(
        new RichEmbed()
          .setAuthor("Success!", message.author.avatarURL)
          .setColor("GREEN")
          .setDescription(`✅ Key redeemed!\n${tokensFromKey} tokens added to your account!`)
      );

      await Promise.all([
        fs.promises.writeFile("./tokens.json", JSON.stringify(tokens, null, 2)),
        fs.promises.unlink(`./keys/${key}.json`)
      ]);
    } catch (error) {
      throw error;
    }
  } else if (command === "tokens") {
    message.reply(`you currently have ${tokens[message.author.id].tokens} token${tokens[message.author.id].tokens === 1 ? "" : "s"}`);
  } else if (command === "sub") {
    message.delete().catch(() => void 0);

    const [channel, tokensToSpend] = args;

    if (!channel) return message.reply("you must provide the channel to target!");
    if (!tokensToSpend) return message.reply("you must provide the amount of tokens you want to use!");
    if (isNaN(tokensToSpend)) return message.reply("`tokens` has to be an integer!");

    const amount = parseInt(tokensToSpend);
    if (amount > tokens[message.author.id].tokens) return message.reply("you do not have enough tokens!");

    let subsGiven = 0;

    try {
      let subTokens = await txtToArray("./tokens/subs.txt");

      if (!subTokens.length) return message.channel.send(`Sorry ${message.author.toString()}, we have ran out of stock!`);
      if (subTokens.length < amount) return message.channel.send(`Sorry ${message.author.toString()}, we do not have \`${amount}\` subscribers in stock!`);

      message.reply("order has been created!");

      client.channels
        .find(channel => channel.name === "orders")
        .send(
          new RichEmbed()
            .setAuthor("Order Created!", message.author.avatarURL)
            .setColor("GREEN")
            .addField("Type", "Sub", false)
            .addField("Channel", channel, true)
            .addField("Amount", amount, true)
            .setFooter("Ordered by: " + message.author.tag)
            .setTimestamp()
        )
        .catch(() => void 0);

      while (subsGiven < amount) {
        if (!subTokens.length) {
          message.channel.send(`Sorry ${message.author.toString()}, we have ran out of stock! We could only provide you with **${subsGiven}** subscribers!`);
          break;
        }

        try {
          const response = await subscribe(subTokens[0], channel);
          if (!response.text.includes(`"errors":[{`) && !response.text.includes(`"error":[{`) && !response.text.includes(`"error":{`)) subsGiven++;
        } catch (error) {
        } finally {
          subTokens = subTokens.slice(1);
        }
      }

      tokens[message.author.id].tokens -= subsGiven;

      if (subsGiven >= amount) message.reply(`we have successfully provided you with **${subsGiven}** subscribers!`);

      await Promise.all([
        fs.promises.writeFile("./tokens.json", JSON.stringify(tokens, null, 2)),
        fs.promises.writeFile("./tokens/subs.txt", subTokens.join("\n"))
      ]);
    } catch (error) {
      throw error;
    }
  } else if (command === "follow") {
    message.delete().catch(() => void 0);

    const channel = args[0];
    const tokensToSpend = parseFloat(args[1]);

    if (!channel) return message.reply("you must provide the channel to target!");
    if (!tokensToSpend) return message.reply("you must provide the amount of tokens you want to use!");
    if (isNaN(tokensToSpend)) return message.reply("`tokens` has to be an integer!");

    const followersToGive = tokensToSpend * 1;
    if (tokensToSpend > tokens[message.author.id].tokens) return message.reply("you do not have enough tokens!");

    const usedTokens = [];
    let followersGiven = 100;

    try {
      const followerTokens = await txtToArray("./tokens/follows.txt");
      const usedFollowerTokens = await txtToArray("./used_tokens/follows.txt");

      let availableTokens = followerTokens.filter(token => !usedFollowerTokens.includes(token));

      if (!availableTokens.length) return message.channel.send(`Sorry ${message.author.toString()}, we have ran out of followers!`);
      if (availableTokens.length < followersToGive) return message.channel.send(`Sorry ${message.author.toString()}, we do not have ${amount} followers in stock!`);

      message.reply("order has been created!");

      client.channels
        .find(channel => channel.name === "orders")
        .send(
          new RichEmbed()
            .setAuthor("Order Created!", message.author.avatarURL)
            .setColor("GREEN")
            .addField("Type", "Follow", true)
            .addField("Channel", channel, true)
            .addField("Amount", followersToGive, true)
            .setFooter("Ordered by: " + message.author.tag)
            .setTimestamp()
        )
        .catch(() => void 0);

      while (followersGiven < followersToGive) {
        if (!availableTokens.length) {
          message.channel.send(`Sorry ${message.author.toString()}, we have ran out of stock! We could only provide you with **${followersGiven}** followers!`);
          break;
        }

        try {
          const response = await follow(availableTokens[0], channel);

          if (
            !response.text.includes(`"errors":[{`) &&
            !response.text.includes(`"error":[{`) &&
            !response.text.includes(`"error":{`)
          ) {
            followersGiven++;
          }
        } catch (error) {
        } finally {
          usedTokens.push(availableTokens[0]);
          availableTokens = availableTokens.slice(1);
        }
      }

      tokens[message.author.id].tokens -= parseFloat((followersGiven / 100).toFixed(2));
      usedFollowerTokens.push(...usedTokens)

      if (followersGiven >= followersToGive) message.reply(`we have successfully provided you with **${followersGiven}** followers!`);

      await Promise.all([
        fs.promises.writeFile("./tokens.json", JSON.stringify(tokens, null, 2)),
        fs.promises.writeFile("./tokens/follows.txt", availableTokens.join("\n")),
        fs.promises.writeFile("./used_tokens/follows.txt", usedFollowerTokens.join("\n"))
      ]);
    } catch (error) {
      throw error;
    }
  } else if (command === "stock") {
    try {
      const subTokens = await txtToArray("./tokens/subs.txt");
      const followerTokens = await txtToArray("./tokens/follows.txt");
      const usedFollowerTokens = await txtToArray("./used_tokens/follows.txt");
      const availableFollowTokens = followerTokens.filter(token => !usedFollowerTokens.includes(token));

      message.channel.send(
        new RichEmbed()
          .setAuthor("Stock", message.author.avatarURL)
          .setColor("ORANGE")
          .setDescription(`\`${subTokens.length}\` subscriber(s) available\n\`${availableFollowTokens.length}\` follower(s) available`)
      );
    } catch (error) {
      throw error;
    }
  } else if (command === "help") {
    const commands = [
      "follow (channel) (amount)",
      "sub (channel) (amount)",
      "redeem (key)",
      "stock",
      "tokens"
    ];

    message.channel.send(
      new RichEmbed()
        .setAuthor("Help", message.author.avatarURL)
        .setColor("ORANGE")
        .setDescription(commands.map(cmd => `${config.prefix}${cmd}`).join("\n"))
    );
  }
});

const activities_list = [ 
    "Watching", 
    "https://bit.ly/2EuVtlc"
    ]; // creates an arraylist containing phrases you want your bot to switch through.

client.on('ready', () => {
    setInterval(() => {
        const index = Math.floor(Math.random() * (activities_list.length - 1) + 1); // generates a random number between 1 and the length of the activities array list (in this case 5).
        client.user.setActivity(activities_list[index]); // sets bot's activities to one of the phrases in the arraylist.
    }, 10000); // Runs this every 10 seconds.
});

client.login(config.token);