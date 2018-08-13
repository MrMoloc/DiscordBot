const Discord = require('discord.js');
const bot = new Discord.Client();
var badwords = require('./bw.js');
var db = require('./db.js');
var key = require('../key.js');

var perms = {
    swisstime: 1,
    test: 5,
    warn: 2,
    updateguild: 5,
    warnlog: 2,
    warnlogall: 1,
    delwarn: 2
}


bot.login(key.data);
bot.on('ready', () => {

    console.log('Logged in as ' + bot.user.tag + '!');
    bot.guilds.forEach(function(guild, guildID) {
        db.data.updateGuild(guild);
        // guild.roles.forEach(function(role, roleID) {
        // db.data.updateRole(role);
        // })
        guild.members.forEach(function(guildMember, MemberID){
            db.data.updateUser(guildMember);
        })
    });
    
});

bot.on('guildUpdate', (oldGuild, newGuild) => {
    try{
        db.data.updateGuild(newGuild);
    } catch(err) {
        console.log(err);
    }
})

bot.on('guildMemberUpdate', (oldMember, newMember) => {
    try{
        db.data.updateUser(newMember);
    }catch(err) {
        log(err);
    }
})

bot.on('userUpdate', (oldUser, newUser) => {
    try{
        db.data.updateUser(newUser);
    }catch(err) {
        log(err);
    }
})

bot.on('roleCreate', (role) => {
    db.data.updateRole(role, 'create');
})

bot.on('roleDelete', (role) => {
    db.data.updateRole(role, 'delete');
})

bot.on('roleUpdate', (oldRole, newRole) => {
    db.data.updateRole(newRole, 'update');
})

bot.on('message', (message) => {

    /*if(message.content == 'ping') {
        message.reply('pong');
        message.channel.sendMessage('sfad');
    }*/
    db.data.getPermLvl(message.member, function(res){
        var userperm =  res.result;

        var author = message.author;

        // Ignoriere Nachrichten von Bots
        if(message.author.bot) {
            return;
        }

        // Die Nachricht in Wörter aufteilen --> Array
        var msg = message.content.split(" ");
        var cmd = msg[0];

        // Verbotene Wörter einfach löschen
        badwords.bw.forEach(word => {
            if(message.content.indexOf(word) + 1) {
                message.delete();
                console.log(getTimeStamp() + " " + author.tag + " said a bad word: " + word);
            }
        });


        // Command Teil, wenn Nachricht mit ? anfängt
        if(cmd.charAt(0) == "?") {
            
            // ? aus Nachricht entfernen
            cmd = cmd.substr(1);

            switch(cmd.toLowerCase()) {

                // Datum und Zeit in der Schweiz ausgeben.
                case "swisstime":
                    if(userperm >= perms.swisstime){
                        var d = new Date();
                        EmbedMsg(message.channel, 0x2e00ff, 'Current time in Switzerland:', getTimeStamp());
                    } else {
                        noPerm(message.channel);
                    }
                    break;

                case 'test':
                    if(userperm >= perms.test){
                        EmbedMsg(message.channel, 0x0000ff, 'Warning issued', mention(author) + ' warned the user ' + mention(author) + ' for the reason:\n He\'s a dick LMAO');
                    } else {
                        noPerm(message.channel);
                    }
                    break;

                //?warn
                case "warn":
                    if(userperm >= perms.warn){
                        if(msg.length >= 3) {   // ?warn <@1234567889> Grund

                            // get mentioned User
                            getMentioned(msg[1], message.guild, function(warnedUser) {

                                // Wenn der gewarnte Beutzer nicht gefunden werden konnte, Errormsg ausgeben
                                if(!warnedUser) {
                                    EmbedMsg(message.channel, 0xff0000, 'Error!', 'I am having trouble finding the specified user. Please mention someone that is on the server.');
                                    log('>>?warn<< could not find user '+msg[1]);
                                    return;
                                }

                                // Warnreason zusammensetzen aus den Argumenten/Wörtern
                                var warnreason = '';
                                for(var i = 2; i < msg.length;i++) {
                                    warnreason += msg[i] + ' ';
                                }
                                warnreason = warnreason.substring(0, warnreason.length -1);

                                // Die Warnung in die DB schreiben
                                db.data.newWarn(warnedUser, author, warnreason, function(resu) {
                                    if(resu.code == 1) {
                                        // Wenn Fehler auftritt (Code 1) Fehlermeldung ausgeben und Benutzer informieren.
                                        outerr(error.result);
                                        EmbedMsg(message.channel, 0xff0000, 'Error!', 'An Error occured, please contact an Admin. Or don\'t, I\'m a bot not a cop.');
                                        // Mich per DM informieren, dass etwas mit der DB nicht stimmt.
                                        EmbedMsg(bot.users.get("153276061163978752"), 0x0000ff, 'DB broke', 'The DB broke or something I\'m sorry senpai');
                                    } else {
                                        // Erfolg, den Benutzer informieren und Logging in die Konsole.
                                        EmbedMsg(message.channel, 0x00ff00, 'Success!', 'You successfully warned ' + mention(warnedUser) + ' for: ' + warnreason);
                                        log(author.tag + ' warned ' + warnedUser.user.tag);
                                    }
                                });

                            });

                        } else {
                            // Zu wenige Argumente
                            SendSyntaxErr(message.channel);
                        }
                    } else {
                        noPerm(message.channel);
                    }
                    break;

                case "updateguild":
                    if(userperm >= perms.updateguild){
                        // DB aufruf
                        db.data.updateGuild(message.guild);
                    } else {
                        noPerm(message.channel);
                    }
                    break;


                case 'warnlog':
                    if(userperm >= perms.warnlogall){
                        if(msg.length == 2) {
                            if(userperm >= perms.warnlog){

                                // gementioneden Member getten
                                getMentioned(msg[1], message.guild, function(member) {

                                    // Wenn getaggter Member existiert
                                    if(member) {

                                        // Die Warning aus der DB holen
                                        db.data.getWarn(member, function(res) {

                                            // Wenn DB anfrage ok
                                            if(res.code == 0) {

                                                // Durch die Resultate (Warnings) iterieren.
                                                var fields = [];
                                                if(res.result.length == 0){
                                                    var emb1 = {
                                                        embed: {
                                                            color: 0x0000ff,
                                                            title: 'The user '+getName(member)+' has no warnings.',
                                                        }
                                                    }
                
                                                    message.channel.send(emb1);
                                                    log(message.author.tag + ' requested warnings for: ' + member.user.tag);

                                                } else {

                                                    for(var i = 0; i < res.result.length; i++) {

                                                        // Wenn die Warning gelöscht wurde Durchstreichen und hinzufügen zum Array
                                                        if(res.result[i].deletiontime != null) {
                                                            fields.push({
                                                                name: '__Warning ID '+res.result[i].warningID+'__',
                                                                value: '~~Warning from:\t'+bot.users.get(res.result[i].issuerID).username
                                                                + '\nWarning text:\t'+res.result[i].warningtext
                                                                + '\nIssued at:\t'+res.result[i].creationtime+'~~'
                                                                + '\nDeleted at:\t'+res.result[i].deletiontime
                                                                + '\nDeleted from:\t'+bot.users.get(res.result[i].deletedbyuserID).username
                                                            });
                                                        } else {
                                                            // Wenn Warning nicht gelöscht, dann einfach zum Array hinzufügen
                                                            fields.push({
                                                                name: '__Warning ID '+res.result[i].warningID+'__',
                                                                value: 'Warning from:\t'+bot.users.get(res.result[i].issuerID).username
                                                                + '\nWarning text:\t'+res.result[i].warningtext
                                                                + '\nIssued at:\t'+res.result[i].creationtime
                                                            });
                                                        }
                
                                                    }
                
                                                    // Die Embedded Message bauen mit dem Array von vorher (warnings)
                                                    var emb = {
                                                        embed: {
                                                            color: 0x00ff00,
                                                            title: 'Warnings for the user '+getName(member),
                                                            fields: fields
                                                        }
                                                    }
                
                                                    // Die Embedded Nachricht senden und loggen.
                                                    message.channel.send(emb);
                                                    log(message.author.tag + ' requested warnings for: ' + member.user.tag);

                                                }

                                            } else { // Wenn DB anfrage nicht OK Benutzer informieren, loggen und Admin informieren.
                                                EmbedMsg(message.channel, 0xff0000, 'An Error occured', 'A Database error occured, you should probably ask an admin to fix it');
                                                outerr(res.result.sqlMessage);
                                                EmbedMsg(bot.users.get("153276061163978752"), 0x0000ff, 'DB broke', 'The DB broke or something I\'m sorry senpai');
                                            }

                                        });

                                    } else {
                                        // Wenn der gesuchte Benutzer nicht gefunden werden konnte.
                                        EmbedMsg(message.channel, 0xff0000, 'Error!', 'I am having trouble finding the specified user. Please mention someone that is on the server.');
                                    }

                                });
                            } else {
                                noPerm(message.channel);
                            }
                        // Wenn kein Argument mitgegeben wird, sollen die warns für alle angezeigt werden.
                        } else if(msg.length == 1) {

                            var fields = [];    // fields für embedded message
                            var countermem = 0; // Counter Member

                            // Iterieren durch alle Member in der Guild
                            message.guild.members.forEach(function(guildMember, guildMemberId) {

                                var counttotal = 0; // Counter für Total Warnings eines User
                                var countdel = 0;   // Counter für gelöschte Warnings eines User

                                // Hole Warnings des Members
                                db.data.getWarn(guildMember, function(res) {

                                    if(res.code == 0) { // Wenn DB abfrage OK
                                        
                                        // Durch die verschiedenen  Warns iterieren und jeweils hochzählen
                                        for(var i = 0; i < res.result.length; i++) {
                                            counttotal++;
                                            if(res.result[i].deletiontime != null) {
                                                countdel++;
                                            }
                                        }

                                        // Anzahl der Warns des User in das Field hinzufügen.
                                        fields.push({
                                            name: getName(guildMember) + ':',
                                            value: getName(guildMember) + ' has ' + counttotal + ' total warnings, ' + countdel + ' have been deleted.'
                                        });

                                        // Ein bisschen cheaty das so zu machen, bin aber zu faul es anders zu machen
                                        // Es wird bei jedem Iterieren countermem um eins hochgezählt und wenn es so gross ist wie
                                        // Die Anzahl an Membern im Server wird die Embedded Message ausgegeben mit der Anzahl an Warnings
                                        countermem++;
                                        if(countermem === message.guild.members.size) {
                                            var emb = {
                                                embed: {
                                                    color: 0x0000ff,
                                                    title: 'Warnings for all the users:',
                                                    fields: fields
                                                }
                                            }
                                            message.channel.send(emb);
                                        }

                                    } else {    // Wenn DB Abfrage nicht OK user informieren, etc, etc, bla, bla, bla
                                        EmbedMsg(message.channel, 0xff0000, 'An Error occured', 'A Database error occured, you should probably ask an admin to fix it');
                                        outerr(res.result.sqlMessage);
                                        EmbedMsg(bot.users.get("153276061163978752"), 0x0000ff, 'DB broke', 'The DB broke or something I\'m sorry senpai');
                                    }

                                });

                            });
                        }
                    } else {
                        noPerm(message.channel);
                    }   
                    break;

                case 'delwarn': case 'warndel':
                    if(userperm >= perms.delwarn){
                        if(msg.length == 2){
                            if(!isNaN(msg[1])) {    //Wenn eine Nummer mitgegeben wurde.

                                db.data.delWarning(msg[1], author, function(res){
                                    if(res.code == 1){
                                        EmbedMsg(message.channel, 0xff0000, 'Error', 'An Error occurred, did you give me a valid warningID?');
                                        log(res.result)
                                    } else if(res.code == 0){
                                        try{
                                            EmbedMsg(message.channel, 0x00ff00, 'Success', 'You successfully deleted a warning from ' + mention(bot.users.get(res.result[0].warneduserID)));
                                            log(author.tag + ' deleted a warning from ' + bot.users.get(res.result[0].warneduserID).tag);
                                        } catch(err){
                                            EmbedMsg(message.channel, 0x00ff00, 'Success', 'You successfully deleted a warning');
                                            log(author.tag + ' deleted a warning');
                                        }
                                    }
                                });

                            } else {
                                SendSyntaxErr(message.channel);
                            }
                        } else {
                            SendSyntaxErr(message.channel);
                        }
                    } else {
                        noPerm(message.channel);
                    }

                    break;

                default:

                    break;
            }

        }
    })
});

function getTimeStamp() {
    var ts = '';
    var rn = new Date(Date.now());
    var month = rn.getMonth() + 1;
    var day = rn.getDate();
    var hour = rn.getHours();
    var minute = rn.getMinutes();
    var second = rn.getSeconds();

    ts += rn.getFullYear() + '/';
    if(month < 10) {
        month = '0' + month;
    }
    ts += month + '/';
    if(day < 10) {
        day = '0' + day;
    }
    ts += day + ' ';
    if(hour < 10) {
        hour = '0' + hour;
    }
    ts += hour + ':';
    if(minute < 10) {
        minute = '0' + minute;
    }
    ts += minute + ':';
    if(second < 10) {
        second = '0' + second;
    }
    ts += second;
    

    return ts;
}

function outerr(err) {
    console.log(getTimeStamp() + " An Error occured: " + err);
}

function mention(user) {
    return '<@'+user.id+'>';
}

function log(logmsg) {
    console.log(getTimeStamp() + " " + logmsg);
}

function getMentioned(taggeduser, guild, cb) {
    var i = 0;
    guild.members.forEach(function(guildMember, guildMemberId) {
        if('<@'+guildMemberId+'>' == taggeduser) {
            i++;
            cb(guildMember);
        }
    });
    if(i == 0) {
        cb(null);
    }
}

function SendSyntaxErr(channel) {
    EmbedMsg(channel, 0xff0000, 'Syntax Error', 'Please check the manual, you made a mistake in the Command Syntax.');
}

function EmbedMsg(channel, color, name, value) {
    channel.send({
        embed: {
            color: color,
            fields: [{
                name: name,
                value: value
            }]
        }
    });
}

function getName(member, cb) {
    if(member.nickname) {
        return member.nickname;
    } else {
        return member.user.username;
    }
}

function noPerm(channel){
    EmbedMsg(channel, 0xff0000, 'Insufficient Permissions', 'You don\' have the permissions required to use this command, if you think this is a mistake contact an admin');
}