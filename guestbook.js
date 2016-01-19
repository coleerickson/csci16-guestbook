Messages = new Mongo.Collection("messages");
Votes = new Mongo.Collection("votes");

if (Meteor.isClient) {
    Meteor.subscribe("messages");
    Meteor.subscribe("votes");

    Template.guestBook.events({
        'submit form': function (event) {
            event.preventDefault();

            var messageBox = $(event.target).find('textarea[name=guestBookMessage]');
            var messageText = messageBox.val();
            messageBox.val('');

            var colorBox = $(event.target).find('.colorpicker');
            var color = colorBox.val();

            Meteor.call("addMessage", name, messageText, color);
        }
    });

    Template.guestBook.helpers({
        messages: function() {
            return Messages.find({}, {'sort': {createdAt: -1}}) || {};
        }
    });

    Template.message.events({
        'click .votes .up': function (event) {
            Meteor.call('voteUp', this._id);
        },
        'click .votes .down': function (event) {
            Meteor.call('voteDown', this._id);
        }
    });

    Template.message.helpers({
        'createdAtFormatted': function () {
            return moment(this.createdAt).fromNow();
        },
        'score': function () {
            var votes = Votes.find({ message: this._id });
            sum = 0;
            votes.forEach(function (vote) {
                sum += vote.value;
            });
            return sum;
        },
        'votedUp': function () {
            var userId = Meteor.userId();
            if (!userId) {
                return;
            }

            var vote = Votes.findOne({ message: this._id, user: userId });
            return vote.value === 1;
        },
        'votedDown': function () {
            var userId = Meteor.userId();
            if (!userId) {
                return;
            }

            var vote = Votes.findOne({ message: this._id, user: userId });
            return vote.value === -1;
        }
    })

    Template.colorpicker.rendered = function() {
        $('.colorpicker').colorpicker({format: "hex"});
    }

    Accounts.ui.config({
        passwordSignupFields: "USERNAME_ONLY"
    });
}

if (Meteor.isServer) {
    // This code only runs on the server
    Meteor.publish("messages", function () {
        return Messages.find();
    });

    Meteor.publish("votes", function () {
        return Votes.find();
    });
}

Meteor.methods({
    voteUp: function (messageId) {
        var userId = Meteor.userId();
        if (!userId) {
            return;
        }

        Votes.update(
            { message: messageId, user: userId },
            {
                $set: {
                    value: 1
                }
            },
            { upsert: true }
        );
    },
    voteDown: function (messageId) {
        var userId = Meteor.userId();
        if (!userId) {
            return;
        }

        Votes.update(
            { message: messageId, user: userId },
            {
                $set: {
                    value: -1
                }
            },
            { upsert: true }
        );
    },
    clearVote: function (messageId) {
        var userId = Meteor.userId();
        if (!userId) {
            return;
        }

        Votes.remove(
            { message: messageId, user: userId }
        );
    },
    addMessage: function (name, text, color) {
        // validate color. if invalid, make it black.
        if (!/^#[0-9a-f]{3}([0-9a-f]{3})?$/i.test(color)) {
            color = "#000000";
        }

        /* require log-in */
        if (!Meteor.userId()) { return; }

        Messages.insert(
            {
                user: Meteor.userId(),
                name: Meteor.user().username,
                text: text,
                color: color,
                createdAt: new Date()
            },
            function (err, id) {
                if (err) { return; }
                Meteor.call('voteUp', id)
            }
        );

    }
})
