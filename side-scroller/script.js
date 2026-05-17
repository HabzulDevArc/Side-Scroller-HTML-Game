window.addEventListener('load', function(){
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d');
    canvas.width = 1300;
    canvas.height = 720;
    let enemies = [];
    let score = 0;
    let gameOver = false;
    let gameVictory = false;
    const bossFrames = [[0,0],[0,1],[0,2],[1,0],[1,1],[0,0],[0,1],[0,2],[1,0],[1,1],[0,4],[0,4],[1,4]];
    let bossShots = [];
    let antiHomingBool = true; // to check player location once to prevent homing missile bossShot
    let foxFireShots = [];
    let bossHealth = 3; 

    class InputHandler {
        constructor(){
            this.keys = [];
            window.addEventListener('keydown', e => {
                if ((   e.key === 'ArrowDown' || 
                        e.key === 'ArrowUp' || 
                        e.key === 'ArrowLeft' || 
                        e.key === 'ArrowRight' ||
                        e.key === ' ') 
                        && this.keys.indexOf(e.key) === -1){
                    this.keys.push(e.key);
                }
            });
            window.addEventListener('keyup', e => {
                console.log(e.key);
                if (    e.key === 'ArrowDown' || 
                        e.key === 'ArrowUp' || 
                        e.key === 'ArrowLeft' || 
                        e.key === 'ArrowRight' ||
                        e.key === ' '){
                    this.keys.splice(this.keys.indexOf(e.key), 1);

                }
            });
        }
    }

    class Player {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = 200;
            this.height = 200;
            this.x = 0;
            this.y = this.gameHeight - this.height;
            this.image = document.getElementById('playerImage')
            this.frameX = 0;
            this.maxFrame = 8;
            this.frameY = 0;
            this.fps = 20;
            this.frameTimer = 0;
            this.frameInterval = 1000/this.fps;
            this.speed = 0; 
            this.vy = 0;
            this.weight = 1;
        }
        draw(context) {
            context.strokeStyle = 'white';
            context.beginPath();
            context.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
            context.stroke();
            context.drawImage(this.image, this.frameX * this.width, this.frameY * this.height, 
                this.width, this.height, this.x, this.y, this.width, this.height);
        }
        update(input, deltaTime, enemies, bossShots){
            // collision detection
            enemies.forEach(enemy => {
                const dx = (enemy.x + enemy.width/2) - (this.x + this.width/2);
                const dy = (enemy.y + enemy.height/2) - (this.y + this.height/2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < enemy.width/2 + this.width/2) {
                    gameOver = true;
                }
            });
            bossShots.forEach(bossShot => {
                const dx = (bossShot.x + bossShot.width/2) - (this.x + this.width/2);
                const dy = (bossShot.y + bossShot.height/2) - (this.y + this.height/2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < this.width/2) {
                    gameOver = true;
                }
            });
            //loop through image frames -- sprite animation
            if (this.frameTimer > this.frameInterval){
                if (this.frameX >= this.maxFrame) this.frameX = 0;
                else this.frameX++;
                this.frameTimer = 0;
            } else {
                this.frameTimer += deltaTime;
            }
            
            //controls
            if (input.keys.indexOf('ArrowRight') > -1){
                this.speed = 7;
            } else if (input.keys.indexOf('ArrowLeft') > -1) {
                this.speed = -7;
            } else if (input.keys.indexOf('ArrowUp') > -1 && this.onGround()) {
                this.vy -= 30;
            } else {
                this.speed = 0;
            }
            // horizontal movement
            this.x += this.speed;
            if (this.x < 0) this.x = 0;
            else if (this.x > this.gameWidth - this.width) this.x = this.gameWidth - this.width;
            // vertical movement
            // ArrowUp jumps and continuous adds weight to vy to slow upward velocity and bring back down at an increasing velocity
            // 
            this.y += this.vy;
            if (!this.onGround()){
                this.vy += this.weight;
                this.maxFrame = 5;
                this.frameY = 1;
            } else {
                this.vy = 0;
                this.maxFrame =8;
                this.frameY = 0;
            }
            if (this.y > this.gameHeight - this.height) this.y = this.gameHeight - this.height;
        }
        onGround(){
            return this.y >= this.gameHeight - this.height;
        }
    }

    class Background {
        constructor(gameWidth, gameHeight){
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.image = document.getElementById('backgroundImage');
            this.x = 0;
            this.y = 0;
            this.width = 2400;
            this.height = 720;
            this.speed = 5;
        }
        draw(context) {
            context.drawImage(this.image, this.x, this.y, this.width, this.height);
            context.drawImage(this.image, this.x + this.width - this.speed, this.y, this.width, this.height);
        }
        update() {
            this.x -= this.speed;
            if (this.x < 0 - this.width) this.x = 0;
        }
    }

    class Enemy {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = 160;
            this.height = 119;
            this.image = document.getElementById('enemyImage');
            this.x = gameWidth;
            this.y = this.gameHeight - this.height;
            this.frameX = 0;
            this.maxFrame = 5;
            this.fps = 20;
            this.frameTimer = 0;
            this.frameInterval = 1000/this.fps;
            this.speed = 8;
            this.markedForDeletion = false;
        }
        draw(context) {
            context.strokeStyle = 'white';
            context.beginPath();
            context.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
            context.stroke();
            context.drawImage(this.image, this.frameX * this.width, 0, this.width, this.height, this.x, this.y, this.width, this.height);
        }
        update(deltaTime){
            if (this.frameTimer > this.frameInterval){
                if (this.frameX >= this.maxFrame) this.frameX = 0;
                else this.frameX++;
                this.frameTimer = 0;
            } else {
                this.frameTimer += deltaTime;
            }
            this.x -= this.speed;
            if (this.x < 0 - this.width) {
                this.markedForDeletion = true;
                score++;
            }    
        }
    }
    
    function handleEnemies(deltaTime){
        if (enemyTimer > enemyInterval + randomEnemyInterval) {
            enemies.push(new Enemy(canvas.width, canvas.height));
            console.log(enemies);
            randomEnemyInterval = Math.random() * 1000 + 500;
            enemyTimer = 0;
            console.log(randomEnemyInterval);
        } else {
            enemyTimer += deltaTime;
        }
        enemies.forEach(enemy => {
            enemy.draw(ctx);
            enemy.update(deltaTime);
        });
        enemies = enemies.filter(enemy => !enemy.markedForDeletion);
    }
    
    // new boss class to handle boss battle
    class Boss {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = 608;
            this.height = 720;
            this.x = this.gameWidth - this.width + 100;
            this.y = this.gameHeight - this.height + 100;
            this.image = document.getElementById('bossImage');
            this.frameX = 0;
            this.frameY = 0;
            this.currentFrame = 0; //track which frame is being displayed
            this.fps = 5;
            this.frameTimer = 0;
            this.frameInterval = 1000/this.fps;
            this.firedThisFrame = false; // tracks boss shot to avoid shooting many times per frame
            this.isHit = false;
            this.hitTimer = 0;
            this.hitDuration = 400;
        }
        draw(context) {
            context.strokeStyle = 'white';
            context.beginPath();
            context.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
            context.stroke();
            context.drawImage(this.image, this.frameX * this.width, this.frameY * this.height, this.width, this.height, this.x, this.y, this.width, this.height);
        }
        update(deltaTime) {
            //
            if (this.isHit) {
                this.hitTimer += deltaTime;
                this.frameX = 3.5;
                this.frameY = 2;

                if (this.hitTimer >= this.hitDuration) {
                    this.isHit = false;
                    this.hitTimer = 0;
                }
                return;
            }
            //animates the boss image based off an array of values that get looped through
            // since they are not all on the same row as in the case of the player and enemy images
            if (this.frameTimer > this.frameInterval){
                this.currentFrame++;
                if (this.currentFrame >= bossFrames.length) {
                    this.currentFrame = 0;
                    console.log(this.currentFrame)
                }
                    this.frameX = bossFrames[this.currentFrame][0];
                    this.frameY = bossFrames[this.currentFrame][1];
                    this.frameTimer = 0;
                    this.firedThisFrame = false; // resets on frame change
                    console.log(this.currentFrame)
                } else {
                this.frameTimer += deltaTime;
            }
        }
    }

    class BossShot {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = 150;
            this.height = 150;
            this.image = document.getElementById('shotImage');
            this.x = this.gameWidth - 350;
            this.y = this.gameHeight - 250;
            this.fps = 20;
            this.frameTimer = 0;
            this.frameInterval = 1000/this.fps;
            this.speed = 1;
            this.markedForDeletion = false;
        }
        draw(context) {
            context.strokeStyle = 'white';
            context.beginPath();
            context.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
            context.stroke();
            context.drawImage(this.image, 0, 0, this.width, this.height, this.x, this.y, this.width, this.height);
        }

        update(deltaTime){
            if (this.frameTimer > this.frameInterval){
                this.frameTimer = 0;
            } else {
                this.frameTimer += deltaTime;
            }
            this.x -= (this.speed += 0.28) - 5; // increasing velocity projectile 
            this.y -= ((this.y - currentTarget)/100);
            //console.log('speed: ' + this.speed,'current target: ' + currentTarget,'this.y: ' + this.y);
            if (this.x < 0 - this.width) {
                antiHomingBool = true;
                this.markedForDeletion = true;
            }
        }
    }

    function handleBossShot(deltaTime) {
        if (boss.currentFrame === 12 && !boss.firedThisFrame) {
            bossShots.push(new BossShot(canvas.width, canvas.height));
            boss.firedThisFrame = true; // stops multiple shots this fram after first
            //console.log(bossShots);
            // fires shot at players location
            if (antiHomingBool){
            currentTarget = player.y;
            antiHomingBool = false;
            }
        }
        bossShots.forEach(bossShot => {
            bossShot.draw(ctx);
            bossShot.update(deltaTime);
        });
        bossShots = bossShots.filter(bossShot => !bossShot.markedForDeletion);
    }

    // class related to fireball shot by the player
    class FoxFire {
        constructor(gameWidth, gameHeight) {
            this.gameWidth = gameWidth;
            this.gameHeight = gameHeight;
            this.width = 178;
            this.height = 90;
            this.image = document.getElementById('foxFireImage');
            this.x = player.x + 170;
            this.y = player.y + 75;
            this.fps = 20;
            this.frameTimer = 0;
            this.frameInterval = 1000/this.fps;
            this.speed = 1;
            this.markedForDeletion = false;
            this.hitBoss = false;
        }
        draw(context) {
            context.strokeStyle = 'white';
            context.beginPath();
            context.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
            context.stroke();
            context.drawImage(this.image, 0, 0, this.width, this.height, this.x, this.y, this.width, this.height);
        }

        update(deltaTime){
            if (this.frameTimer > this.frameInterval){
                this.frameTimer = 0;
            } else {
                this.frameTimer += deltaTime;
            }
            this.x += (this.speed += 0.28); // increasing velocity projectile 
            //console.log('speed: ' + this.speed,'current target: ' + currentTarget,'this.y: ' + this.y);
            if (this.x > this.gameWidth) {
                this.markedForDeletion = true;
            }
        }
    }

    function handleFoxFire(input, deltaTime) {
        if (input.keys.indexOf(' ') > -1 && foxFireShots.length === 0) {
            foxFireShots.push(new FoxFire(canvas.width, canvas.height));
            //console.log(foxFireShots);
        }
        foxFireShots.forEach(foxFire => {
            //check for collision with boss and reduce skulls
            const dx = (boss.x + boss.width/2) - (foxFire.x + foxFire.width/2);
            const dy = (boss.y + boss.height/2) - (foxFire.y + foxFire.height/2);
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < boss.width/2 + foxFire.width/2 && !foxFire.hitBoss) {
                boss.isHit = true;
                foxFire.hitBoss = true;
                console.log('boss is hit, health:' + bossHealth);
                // hides a skull from right to left when hit
                if (bossHealth > 0) {
                    skulls[bossHealth - 1].visible = false;
                }
                bossHealth--; 
                // check for victory condition
                if (bossHealth <= 0) {
                    gameVictory = true;
                }
            }
            foxFire.draw(ctx);
            foxFire.update(deltaTime);
        });
        foxFireShots = foxFireShots.filter(foxFire => !foxFire.markedForDeletion);
    }

    //skulls to act as health markers for boss
    class Skull {
        constructor(x, y) {
            this.x = x;
            this.y = y;
            this.width = 59;
            this.height = 60;
            this.image = document.getElementById('skullImage');
            this.visible = true;
        }
        
        draw(context) {
            if (this.visible) {
                context.drawImage(this.image, this.x, this.y, this.width, this.height);
            }
        }
    }

    function displayStatusText(context){
        context.font = '40px Helvetica';
        context.fillStyle = 'black';
        context.fillText('Score: ' + score, 20, 50);
        context.fillStyle = 'white';
        context.fillText('Score: ' + score, 22, 52);
        if (gameOver){
            context.textAlign = 'center';
            context.fillStyle = 'black';
            context.fillText('GAME OVER, try again!', canvas.width /2, 200);
            context.fillStyle = 'white';
            context.fillText('GAME OVER, try again!', canvas.width /2 + 2, 202);
        }
        if (gameVictory){
            context.textAlign = 'center';
            context.fillStyle = 'black';
            context.fillText('Congratz! You done did it!', canvas.width /2, 200);
            context.fillStyle = 'white';
            context.fillText('Congratz! You done did it!', canvas.width /2 + 2, 202);
            console.log('victory');
        }
    }

    const input = new InputHandler();
    const player = new Player(canvas.width, canvas.height);
    const background = new Background(canvas.width, canvas.height);
    const enemy1 = new Enemy(canvas.width, canvas.height);
    const boss = new Boss(canvas.width, canvas.height);
    const bossShot = new BossShot(canvas.width, canvas.height);
    const foxFire = new FoxFire(canvas.width, canvas.height);
    const skulls = []; //holds the skulls
    //skull positioning
    const skullSpacing = 100;
    const skullStartX = boss.x + (boss.width/2) - (skullSpacing * 1.5);
    const skullY = boss.y - 100;
    // add initial skulls to be put above boss as health markers
    for (let i = 0; i < 3; i++) {
        skulls.push(new Skull(skullStartX + (i * skullSpacing), skullY));
    }


    let lastTime = 0;
    let enemyTimer = 0;
    let enemyInterval = 2000;
    let randomEnemyInterval = Math.random() * 1000 + 500;
    let currentTarget = 0;

    function animate(timeStamp){
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;
        //console.log(deltaTime);
        ctx.clearRect(0,0,canvas.width, canvas.height);
        background.draw(ctx);
        if (score < 3){
            background.update();
        }    
        player.draw(ctx);
        player.update(input, deltaTime, enemies, bossShots);
        handleEnemies(deltaTime);
        displayStatusText(ctx);
        if (score > 2) {
            boss.draw(ctx);
            boss.update(deltaTime);
        }
        skulls.forEach(skull => skull.draw(ctx));
        handleFoxFire(input, deltaTime);
        handleBossShot(deltaTime);
        if (!gameOver && !gameVictory) {
            requestAnimationFrame(animate);
        } else {
            displayStatusText(ctx);
        }    
    }
    animate(0);
})