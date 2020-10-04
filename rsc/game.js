/**
 * game.js
 * Holds game state and game logic.
 */

// ..




// Author: Happy
// jquery start new singleGameScene/multiGameScene
$(document).ready(function () {
    $("#singlePlayerbtn").click(function () {
        $('#menuScreen').fadeOut('fast', function () {
            $('#singlePlayer').fadeIn('fast');
        });
    });
    $("#instructionsbtn").click(function () {
        $('#menuScreen').fadeOut('fast', function () {
            $('#instructions').fadeIn('fast');
        });  
    });
});

