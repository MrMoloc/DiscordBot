var mysql = require('mysql');
const Discord = require('discord.js');
var key = require('../key.js');

// Connection aufbauen
var con = mysql.createConnection(key.db);

// Die Funtionen werden in eine Variable gespeichert.
var methods = {

    getUserbyID: function(userid, cb){

        con.query('SELECT username FROM user WHERE userID = ?', userid, function(err, result){
            if(err) {
                cb({code: 1, result: err});
            } else {
                cb({code: 0, result: result[0].username});
            }
        });

    },

    newWarn: function(member, issuer, warntext, cb) {

        // Variable wird erstellt, die nacher in die DB eingefügt wird.
        var warn = {
            guildID: member.guild.id, 
            warneduserID: member.id, 
            issuerID: issuer.id, 
            creationtime: getTimeStamp(),
            warningtext: warntext
        }

        // In die DB einfügen un Code zurück (Code 1: err, Code 0: Alles gucci)
        con.query('INSERT INTO warning SET ?', warn, function(err) {
            if(err) {
                cb({code: 1, result: err});
            } else {
                cb({code: 0, result: null});
            }
        })

    },

    getWarn: function(member, cb) {

        // DB Abfrage: Alle Warnings von einem Meber einer Guild
        //con.query('SELECT * FROM warning WHERE warneduserID = ' + member.id + ' AND guildID = ' + member.guild.id, function (err, result) {
        con.query('SELECT w.warningID, u.username AS deletedby, w.issuerID, u2.username AS issuerName, w.warningtext, w.creationtime, w.deletiontime, w.deletedbyuserID FROM warning AS w LEFT JOIN user AS u ON w.deletedbyuserID=u.userID INNER JOIN user AS u2 ON w.issuerID=u2.userID WHERE w.warneduserID = ? AND w.guildID = ?', [member.id, member.guild.id], function(err, result){
            
            //Code zeugs zurückgeben
            if(err) {
                cb({code: 1, result: err});
            } else {
                cb({code: 0, result: result});
            }

        });

    },

    getPermLvl: function(member, cb) {

        // Abfrage nach PermissionsLevel von einem User auf einer Guild
        try{
            con.query('SELECT permlvl FROM useringuild WHERE userID = ' + member.id + ' AND guildID = ' + member.guild.id, function (err, result) {

                if(err || typeof result[0] === 'undefined' ) {
                    cb({code: 1, result: err});
                    return;
                }
    
                if(result[0].permlvl > 1){
    
                    if(err) {
                        cb({code: 1, result: err});
                    } else {
                        cb({code: 0, result: result[0].permlvl});
                    }
    
                } else {
                    
                    con.query('SELECT * FROM roles WHERE permlvl > 1 AND guildID = ?', member.guild.id, function(err, res){
                        var maxperm = 1;
    
                        for(var i = 0; i < res.length; i++){
                            member.roles.forEach(function(role){
                                if(role.id == res[i].roleID){
                                    if(res[i].permlvl > maxperm){
                                        maxperm = res[i].permlvl;
                                    }
                                }
                            })
                        }
    
                        if(err) {
                            cb({code: 1, result: err});
                        } else {
                            cb({code: 0, result: maxperm});
                        }
    
                    });
                    
                }
    
            });
        } catch(error){
            log(error);
        }

    },

    delWarning: function(warnid, user, cb){
        
        con.query('SELECT * FROM warning WHERE warningID = ?', warnid, function(err, res){

            if(err || typeof res[0] === 'undefined' ) {
                cb({code: 1, result: err});
                return;
            }

            if(res[0].warningID == warnid){

                con.query('UPDATE warning SET deletiontime = ?, deletedbyuserID = ? WHERE warningID = ?', [getTimeStamp(), user.id, warnid], function(err1){

                    if(err) {
                        cb({code: 1, result: err1});
                    } else {
                        cb({code: 0, result: res});
                    }

                });

            }

        });
        
    },

    getRule: function(rulename, guildID, cb){
        
        con.query('SELECT * FROM rules WHERE guildID = ? AND ruleindex = ?', [guildID, rulename], function(err, res){

            if(err || typeof res[0] === 'undefined' ) {
                cb({code: 1, result: err});
                return;
            } else {
                cb({code: 0, result: res});
            }
            
        });
        
    },

    updateGuild: function(guild) {

            // Hole eine Guilde
            con.query('SELECT * FROM guild WHERE guildID = ' + guild.id, function (err, result) {

                if(err)throw err; // TODO: umbauen mit callback, dass abgefangen werden kann in index.js
                
                // Wenn diese Guild nicht existiert in der DB
                if(result[0] == null) {

                    // Guild in DB einfügen
                    con.query('INSERT INTO guild SET ?', {guildID: guild.id, guildname: guild.name}, function(err, res) {
                        if(err) {
                            log(err);
                        } else {
                            log('Successfully added '+guild.name+' to guilds in the DB.');
                        }
                    });

                } else {

                    // Wenn nötig, in der DB den Namen der Guild updaten
                    if(result[0].guildname != guild.name) {

                        con.query('UPDATE guild SET guildname = ? WHERE guildID = ?', [guild.name, guild.id], function(err, res) {
                            if(err) {
                                log(err);
                            } else {
                                log('Successfully updated '+guild.name+' in the DB.');
                            }
                        });

                    }

                }

            });

    },

    claimableRoles: function(guild, cb){

        con.query('SELECT * FROM roles WHERE guildID = ? AND selfassign = 1', guild.id, function(err, result){

            if(err) {
                cb({code: 1, result: err});
            } else {
                cb({code: 0, result: result});
            }

        });

    },

    claimableRoleswemoji: function(guild, cb){

        con.query('SELECT * FROM roles WHERE guildID = ? AND assignemoji IS NOT NULL AND assigngroup IS NOT NULL AND selfassign = 1', guild.id, function(err, result){

            if(err) {
                cb({code: 1, result: err});
            } else {
                cb({code: 0, result: result});
            }

        });

    },

    addClaimable: function(guild, role, cb){

        con.query('UPDATE roles SET selfassign = 1 WHERE guildID = ? AND roleID = ?', [guild.id, role.id], function(err, res){

            if(err) {
                cb({code: 1, result: err});
            } else {
                cb({code: 0, result: res});
            }

        })

    },

    delClaimable: function(guild, role, cb){

        con.query('UPDATE roles SET selfassign = 0 WHERE guildID = ? AND roleID = ?', [guild.id, role.id], function(err, res){

            if(err) {
                cb({code: 1, result: err});
            } else {
                cb({code: 0, result: res});
            }

        })

    },

    updateRole: function(role, method) {

        // Hole die Rolle
        con.query('SELECT * FROM roles WHERE roleID = ' + role.id, function (err, result, fields) {
            
            if(err) log(err); // Bei Error loggen

            // Wenn die Rolle nicht gelöscht werden soll
            if(method != 'delete') {

                // Wenn die Rolle noch nicht existiert, soll sie erstellt werden.
                if(!result[0]) {
                    con.query('INSERT INTO roles SET ?', {roleID: role.id, rolename: role.name, guildID: role.guild.id}, function(err, res) {
                        if(err) {
                            log(err);
                        } else {
                            log('Added '+role.name+' to the roles');
                        }
                    })
                // Wenn sie existiert, soll der Name geupdated werden.
                } else if(role.name != result[0].rolename){
                    con.query('UPDATE roles SET ? WHERE roleID = ?', [{rolename: role.name}, role.id], function(err, res) {
                        if(err) {
                            log(err);
                        } else {
                            log('Updated '+role.name+' in DB');
                        }
                    })
                }

            } else {

                // Wenn Rolle gelöscht werden soll, dann löschen
                con.query('DELETE FROM roles WHERE roleID = '+role.id, function(err, res) {
                    if(err) {
                        log(err);
                    } else {
                        log('Deleted '+role.name+' from the roles');
                    }
                })

            }

        });

    },

    getWarnLog: function(guild, cb) {
        con.query('SELECT warnlog FROM guild WHERE guildID = ' + guild.id, function (err, result) {
     
            if(err) {
                cb({code: 1, result: err});
            } else {
                cb({code: 0, result: result[0].warnlog});
            }

        });
    },

    updateUser: function(member) {

        // Den Member zu einem User machen wenn nötig
        var us;
        if(member instanceof Discord.GuildMember) {
            us = member.user;
        } else {
            us = member;
        }

        // User Updaten, das ganze Zeug wie oben mit dem GuildMember... Bla bla bla
        con.query('SELECT * FROM user WHERE userID = ' + us.id, function(err, result) {

            if(err) log(err);
            if(!result[0]) {

                con.query('INSERT INTO user SET ?', {userID: us.id, username: us.username}, function(err, res) {
                    if(err) {
                        log(err);
                    } else {
                        log('Added '+us.tag+' to the users');
                    }
                    rofl();
                });

            } else if(result[0].username != us.username) {

                con.query('UPDATE user SET ? WHERE userID = ?', [{username: us.username}, us.id], function(err, res) {
                    if(err) {
                        log(err);
                    } else {
                        log('Updated '+us.username+' in DB');
                    }
                    rofl();
                })

            } else {
                rofl();
            }

            function rofl(){
                // Überprüfen, ob übergebene Variable auch einem Member entspricht.
                if(member instanceof Discord.GuildMember) {

                    // GuildMember von der DB holen
                    con.query('SELECT * FROM useringuild WHERE guildID = ? AND userID = ?', [member.guild.id, member.user.id], function(err, resu) {
                        
                        if(err) log(err);
                        // Wenn noch kein Eintrag ist, dann den User in die DB schreiben.
                        if(!resu[0]) {

                            con.query('INSERT INTO useringuild SET ?', {guildID: member.guild.id, userID: member.user.id}, function(err, resul) {
                                if(err) log(err);
                                log('Added '+member.user.tag+' to the users');
                            })

                        }

                    });

                }
            }

        });

    }

}


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

function log(logmsg) {
    console.log(getTimeStamp() + " " + logmsg);
}

// Die Funktionen exportieren.
exports.data = methods;