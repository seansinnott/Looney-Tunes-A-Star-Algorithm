// This game involves you controlling Bugs Bunny, and the objective is to burrow through the first two floors and reach the Carrot object on floor 1     //
// without being caught by Yosemite Sam. For the best gaming experience, please use the 'Move With' option while playing.                                //
// Yosemite Sam tracks Bugs Bunny's location using an A* Pathfinding Algorithm so I have slowed him down to only move every 3 steps you take in order    //
// to make the game more playable (otherwise it's quite difficult).                                                                                      //
//-------------------------------------------------------------------------------------------------------------------------------------------------------//


const CLOCKTICK = 100;		// move things every 100 milliseconds
const MAXSTEPS = 1000;		// allowed 1000 steps before game is over


//-------------------- global constants --------------------//

const GRIDSIZE = 50;											// number of squares along side of world	   
const NOBOXES = Math.trunc ( (GRIDSIZE * GRIDSIZE) / 10 );		// density of maze
const SQUARESIZE = 100;											// size of square in pixels
const MAXPOS = GRIDSIZE * SQUARESIZE;							// length of one side in pixels 	
const SKYCOLOR 	= 0xddffdd;										// a number, not a string 
const BLANKCOLOR = SKYCOLOR ;									// make objects this color until texture arrives
const LIGHTCOLOR = 0x000000 ;									// colour of ambient light used later
const STARTRADIUSCONST = MAXPOS * 1 ;							// distance from centre to start the camera at
const SKYBOXCONST = MAXPOS * 3 ;								// where to put skybox 
const MAXRADIUSCONST = MAXPOS * 10  ;							// maximum distance from camera we will render things  


//-------------------- mind can pick on of these actions --------------------//

const ACTION_LEFT 		= 0;		   
const ACTION_RIGHT 		= 1;
const ACTION_UP 		= 2;		 
const ACTION_DOWN 		= 3;
const ACTION_STAYSTILL 	= 4;


//-------------------- contents of a grid square --------------------//

const GRID_BLANK 	= 0;
const GRID_WALL 	= 1;
const GRID_MAZE 	= 2;
const GRID_GROUND   = 3;


//-------------------- random functions --------------------//

function randomfloatAtoB ( A, B ) {
	return ( A + ( Math.random() * (B-A) ) );
}

function randomintAtoB ( A, B )	{
	return  ( Math.round ( randomfloatAtoB ( A, B ) ) );
}


//-------------------- START OF WORLD CLASS --------------------//
 
function World() { 
	var GRID1 	= new Array(GRIDSIZE);			// grid 1, 2 and 3 represent the 3 floors
	var GRID2 	= new Array(GRIDSIZE);			// in the game and can be used to check if
	var GRID3 	= new Array(GRIDSIZE);			// a square is occupied etc.

	var UNDERSIDE 	= new Array(GRIDSIZE);			// used as the bottom of the floor on which objects and characters stand

	var FLOOR_1_WALLS 	= new Array ( 4 * GRIDSIZE );			// wall for floors
	var FLOOR_2_WALLS 	= new Array ( 4 * GRIDSIZE );			// 1, 2 and 3
	var FLOOR_3_WALLS 	= new Array ( 4 * GRIDSIZE );			// respectively

	var FLOOR_1_MAZE 	= new Array ( NOBOXES );			// maze for floors
	var FLOOR_2_MAZE 	= new Array ( NOBOXES );			// 1, 2 and 3
	var FLOOR_3_MAZE 	= new Array ( NOBOXES );			// respectively

	var FLOOR_1_GROUND = new Array (GRIDSIZE * GRIDSIZE);			// ground for floors
	var FLOOR_2_GROUND = new Array (GRIDSIZE * GRIDSIZE);			// 1, 2 and 3
	var FLOOR_3_GROUND = new Array (GRIDSIZE * GRIDSIZE);			// respectively

	var theagent, theenemy, thecamera, thecarrot, topfloorburrow, midfloorburrow;			// will be used to represent the object after which they are named
	  
	var enemyFloor  = 1950;			// the floor on which the enemy is initialised -> 1950 is the 3rd floor
	var agentFloor = 1950;			// the floor on which the agent is initialised

	var ei, ej;			// enemy position on squares
	var ai, aj;			// agent position on squares
	var ci, cj;			// camera position on squares (will be behind and above Bugs Bunny)
	var ti, tj;			// carrot position on squares
	var b1i, b1j;		// top floor burrow position on squares
	var b2i, b2j;		// middle floor burrow position on squares

	// booleans used to identify what direction Bugs Bunny is facing at any given time
    var bugsLookingForward = true;
    var bugsLookingBack = false;
    var bugsLookingLeft = false;
    var bugsLookingRight = false;
    
	// booleans used to identify what direction Yosemite Sam is facing at any given time
    var samLookingForward = true;
    var samLookingBack = false;
    var samLookingLeft = false;
    var samLookingRight = false;
    
	// will be used as array of size 2 marking the coordinates of Bugs Bunny and Yosemite Sam in Pathfinding Algorithm
    var currentAgentPosition;
    var currentEnemyPosition;
    
	var step;			// number of steps in game so far

 	var self = this;			// needed for private fn to call public fn
	
	
	// initialise the 3 floors
	function initGrid() {
		for (var i = 0; i < GRIDSIZE ; i++) {
			GRID1[i] = new Array(GRIDSIZE);	
			GRID2[i] = new Array(GRIDSIZE);
			GRID3[i] = new Array(GRIDSIZE);

			for (var j = 0; j < GRIDSIZE ; j++) {
				GRID1[i][j] = GRID_BLANK ;
				GRID2[i][j] = GRID_BLANK ;
				GRID3[i][j] = GRID_BLANK ;
			}
		}
	}

	// initialise the bottom of the 3 floors
	function initUnderside() {
		for (var i = 0; i < GRIDSIZE ; i++) {
			UNDERSIDE[i] = new Array(GRIDSIZE);		// each element is an array 
			for (var j = 0; j < GRIDSIZE ; j++) {
				UNDERSIDE[i][j] = GRID_BLANK ;
			}
		}
	}

	// checks if given coordinates are currently occupied by an object
	function occupied ( i, j ) {
		if ( GRID1[i][j] == GRID_WALL)
			return true;
		if ( GRID1[i][j] == GRID_MAZE && agentFloor == -50) 
			return true;

		if ( GRID2[i][j] == GRID_WALL) 
			return true;
		if ( GRID2[i][j] == GRID_MAZE && agentFloor == 950) 
			return true;

		if ( GRID3[i][j] == GRID_WALL) 
			return true;
		if ( GRID3[i][j] == GRID_MAZE && agentFloor == 1950) 
			return true;

		return false;
	}
	
	// similar to above, but doesn't consider where the agent is, this method prevents the burrows/carrot being places in same position as a maze object
	function cannotPlaceObject(i,j) {
	    if ( GRID1[i][j] == GRID_WALL)
			return true;
		if ( GRID1[i][j] == GRID_MAZE) 
			return true;

		if ( GRID2[i][j] == GRID_WALL) 
			return true;
		if ( GRID2[i][j] == GRID_MAZE && agentFloor) 
			return true;

		if ( GRID3[i][j] == GRID_WALL) 
			return true;
		if ( GRID3[i][j] == GRID_MAZE && agentFloor) 
			return true;

		return false;
	}

	// checks to see if Bugs Bunny is standing on a Burrow object and can move down to the next floor
	function canBurrow ()	{
		if ( b1i == ai && b1j == aj && agentFloor == 1950) return true;		// fixed objects
		if ( b2i == ai && b2j == aj  && agentFloor == 950) return true;
		
		return false;
	} 

	// translates objects to Three.js coordinates
	function translate ( x ) {
		return ( x - ( MAXPOS/2 ) );
	}


	// initialises the skybox.		credit:	 http://korzonrocknet.deviantart.com/art/Skybox-446554846
	function initSkybox() {
		var materialArray = [
			( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/SeanSinnott/skybox_right.jpg" ), side: THREE.BackSide } ) ),
			( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/SeanSinnott/skybox_left.jpg" ), side: THREE.BackSide } ) ),
			( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/SeanSinnott/skybox_top.jpg" ), side: THREE.BackSide } ) ),
			( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/SeanSinnott/skybox_bottom.jpg" ), side: THREE.BackSide } ) ),
			( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/SeanSinnott/skybox_near.jpg" ), side: THREE.BackSide } ) ),
			( new THREE.MeshBasicMaterial ( { map: THREE.ImageUtils.loadTexture( "/uploads/SeanSinnott/skybox_far.jpg" ), side: THREE.BackSide } ) ),
		];

		var skyGeometry = new THREE.CubeGeometry ( SKYBOXCONST, SKYBOXCONST, SKYBOXCONST );	
		var skyMaterial = new THREE.MeshFaceMaterial ( materialArray );
		var theskybox = new THREE.Mesh ( skyGeometry, skyMaterial );
		threeworld.scene.add( theskybox );
	}

	//-------------------- START OF LOAD TEXTURES & OBJECTS --------------------//
	function loadTextures() {
	    
		// load in Bugs Bunny object.		credit:  https://www.models-resource.com/wii/looneytunesacmearsenal/model/9874/
	    var m = new THREE.MTLLoader();
	    m.setTexturePath ( "/uploads/SeanSinnott/" );
	    m.setPath        ( "/uploads/SeanSinnott/" );
	    m.load( "bugs.mtl", function( materials ) {
 
    		materials.preload();
    		var o = new THREE.OBJLoader();
    		o.setMaterials ( materials );
    		o.setPath ( "/uploads/SeanSinnott/" );
    		o.load( "bugs.obj", function ( object ) {
    			addagent ( object );
		    } );
	    } );
	    
		// load in Yosemite Sam object.			credit:  https://www.models-resource.com/wii/looneytunesacmearsenal/model/15925/
	    var n = new THREE.MTLLoader();
	    n.setTexturePath ( "/uploads/SeanSinnott/" );
	    n.setPath        ( "/uploads/SeanSinnott/" );
	    n.load( "yosemite.mtl", function( materials ) {
 
    		materials.preload();
    		var p = new THREE.OBJLoader();
    		p.setMaterials ( materials );
    		p.setPath ( "/uploads/SeanSinnott/" );
    		p.load( "yosemite.obj", function ( object ) {
    			addenemy ( object );
		    } );
	    } );
	    
		// load in carrot object.		credit:  https://www.models-resource.com/custom_edited/mariocustoms/model/8638/
	    var s = new THREE.MTLLoader();
	    s.setTexturePath ( "/uploads/SeanSinnott/" );
	    s.setPath        ( "/uploads/SeanSinnott/" );
	    s.load( "carrot.mtl", function( materials ) {
 
    		materials.preload();
    		var t = new THREE.OBJLoader();
    		t.setMaterials ( materials );
    		t.setPath ( "/uploads/SeanSinnott/" );
    		t.load( "carrot.obj", function ( object ) {
    			addcarrot ( object );
		    } );
	    } );
	    
		// load in both burrow objects.		credit:  https://www.models-resource.com/pc_computer/harrypottertheprisonerofazkaban/model/14837/
	    var x = new THREE.MTLLoader();
	    x.setTexturePath ( "/uploads/SeanSinnott/" );
	    x.setPath        ( "/uploads/SeanSinnott/" );
	    x.load( "burrow.mtl", function( materials ) {
 
    		materials.preload();
    		var y = new THREE.OBJLoader();
    		y.setMaterials ( materials );
    		y.setPath ( "/uploads/SeanSinnott/" );
    		y.load( "burrow.obj", function ( object ) {
    			addmidburrow ( object );
		    } );
	    } );	    
	    var q = new THREE.MTLLoader();
	    q.setTexturePath ( "/uploads/SeanSinnott/" );
	    q.setPath        ( "/uploads/SeanSinnott/" );
	    q.load( "burrow.mtl", function( materials ) {
 
    		materials.preload();
    		var r = new THREE.OBJLoader();
    		r.setMaterials ( materials );
    		r.setPath ( "/uploads/SeanSinnott/" );
    		r.load( "burrow.obj", function ( object ) {
    			addtopburrow ( object );
		    } );
	    } );
	    	    
	    // load in wall texture.		credit: https://freestocktextures.com/texture/wood-weathered-plank,421.html
		var loader1 = new THREE.TextureLoader();
		loader1.load ( '/uploads/SeanSinnott/fence.jpg',		function ( thetexture ) {			 
			thetexture.minFilter = THREE.LinearFilter;
			paintWalls ( new THREE.MeshBasicMaterial( { map: thetexture } ) );
		} ); 

		// load in maze texture. 		credit:  https://freestocktextures.com/texture/leaves-plant-nature,686.html
		var loader2 = new THREE.TextureLoader();
		loader2.load ( '/uploads/SeanSinnott/bush.jpg',		function ( thetexture ) {			 
			thetexture.minFilter = THREE.LinearFilter;
			paintMaze ( new THREE.MeshBasicMaterial( { map: thetexture } ) );
		} ); 

		// load in ground texture, used same ground as in skybox above.		credit:  http://korzonrocknet.deviantart.com/art/Skybox-446554846
		var loader3 = new THREE.TextureLoader();
		loader3.load ( '/uploads/SeanSinnott/skybox_bottom.jpg',		function ( thetexture ) {			 
			thetexture.minFilter = THREE.LinearFilter;
			paintGround ( new THREE.MeshBasicMaterial( { map: thetexture } ) );
		} );
	}
	//-------------------- END OF LOAD TEXTURES & OBJECTS --------------------//
	
	// add Bugs Bunny object into world
	function addagent ( object ) {
    	object.scale.multiplyScalar ( 20 );    	   
    	theagent = object;
    	theagent.rotateY(2 * (Math.PI / 2));
    	threeworld.scene.add( theagent ); 
    }
    
	// add Yosemite Sam object into world
    function addenemy ( object ) {
    	object.scale.multiplyScalar ( 30 );    	   
    	theenemy = object;
    	theenemy.rotateY(2 * (Math.PI / 2));
    	threeworld.scene.add( theenemy ); 
    }

	// add Carrot object into world
    function addcarrot ( object ) {
    	object.scale.multiplyScalar ( 2 );    	   
    	thecarrot = object;
    	thecarrot.rotateY(2 * (Math.PI / 2));
    	threeworld.scene.add( thecarrot ); 
    }
    
	// add Top Burrow object into world
    function addtopburrow ( object ) {
    	object.scale.multiplyScalar ( 1 );    	   
    	topfloorburrow = object;
    	threeworld.scene.add( topfloorburrow ); 

    }
    
	// add Middle Burrow object into world
    function addmidburrow ( object ) {
    	object.scale.multiplyScalar ( 1 );    	   
    	midfloorburrow = object;
    	threeworld.scene.add( midfloorburrow ); 
    }
    

	//-------------------- START OF WALL FUNCTIONS --------------------//
	
	//initialise the walls logically
	function initLogicalWalls() {
		for (var i = 0; i < GRIDSIZE ; i++) 
			for (var j = 0; j < GRIDSIZE ; j++) 
				if ( ( i==0 ) || ( i==GRIDSIZE-1 ) || ( j==0 ) || ( j==GRIDSIZE-1 ) ) {
					GRID1[i][j] = GRID_WALL ;
					GRID2[i][j] = GRID_WALL ;
					GRID3[i][j] = GRID_WALL ;
				}
	}

	// initialise the walls in terms of Three.js
	function initThreeWalls() {
		var t = 0;
		for (var i = 0; i < GRIDSIZE ; i++) {
			for (var j = 0; j < GRIDSIZE ; j++) {
				if ( GRID1[i][j] == GRID_WALL ) {
					var shape    = new THREE.BoxGeometry( SQUARESIZE, SQUARESIZE, SQUARESIZE );			 
					var thecube1  = new THREE.Mesh( shape );
					var thecube2  = new THREE.Mesh( shape );
					var thecube3  = new THREE.Mesh( shape );

					thecube1.material.color.setHex( BLANKCOLOR  );	
					thecube2.material.color.setHex( BLANKCOLOR  );
					thecube3.material.color.setHex( BLANKCOLOR  );

					thecube1.position.x = translate ( i * SQUARESIZE );
					thecube1.position.z = translate ( j * SQUARESIZE );   	
					thecube1.position.y =  0;

					thecube2.position.x = translate ( i * SQUARESIZE );
					thecube2.position.z = translate ( j * SQUARESIZE );   	
					thecube2.position.y =  1000;

					thecube3.position.x = translate ( i * SQUARESIZE );
					thecube3.position.z = translate ( j * SQUARESIZE );   	
					thecube3.position.y =  2000;

					threeworld.scene.add(thecube1);
					threeworld.scene.add(thecube2);
					threeworld.scene.add(thecube3);

					FLOOR_1_WALLS[t] = thecube1;
					FLOOR_2_WALLS[t] = thecube2;
					FLOOR_3_WALLS[t] = thecube3;
					t++;
				}
			}
		}
	}

	// paint the walls
	function paintWalls ( material ) {
		for ( var i = 0; i < FLOOR_1_WALLS.length; i++ ) { 
			if ( FLOOR_1_WALLS[i] ) {
				FLOOR_1_WALLS[i].material = material;
				FLOOR_2_WALLS[i].material = material;
				FLOOR_3_WALLS[i].material = material;
			}
		}
	}
	//-------------------- END OF WALL FUNCTIONS --------------------//
	
	
	//-------------------- START OF GROUND FUNCTIONS --------------------//
	
	//initialise the ground logically
	function initLogicalGround() {
		for (var i = 0; i < GRIDSIZE ; i++) 
			for (var j = 0; j < GRIDSIZE ; j++) 
				UNDERSIDE[i][j] = GRID_GROUND;   
	}

	// initialise the ground in terms of Three.js
	function initThreeGround() {
		var t = 0;
		for (var i = 0; i < GRIDSIZE ; i++) {
			for (var j = 0; j < GRIDSIZE ; j++) {
				if ( UNDERSIDE[i][j] == GRID_GROUND ) {
					var shape    = new THREE.BoxGeometry( SQUARESIZE, SQUARESIZE, SQUARESIZE );			 
					var thecube1  = new THREE.Mesh( shape );
					var thecube2  = new THREE.Mesh( shape );
					var thecube3  = new THREE.Mesh( shape );

					thecube1.material.color.setHex( BLANKCOLOR  );	
					thecube2.material.color.setHex( BLANKCOLOR  );
					thecube3.material.color.setHex( BLANKCOLOR  );

					thecube1.position.x = translate ( i * SQUARESIZE );
					thecube1.position.z = translate ( j * SQUARESIZE );   	
					thecube1.position.y =  -100;

					thecube2.position.x = translate ( i * SQUARESIZE );
					thecube2.position.z = translate ( j * SQUARESIZE );   	
					thecube2.position.y =  900;

					thecube3.position.x = translate ( i * SQUARESIZE );
					thecube3.position.z = translate ( j * SQUARESIZE );   	
					thecube3.position.y =  1900;

					threeworld.scene.add(thecube1);
					threeworld.scene.add(thecube2);
					threeworld.scene.add(thecube3);

					FLOOR_1_GROUND[t] = thecube1;
					FLOOR_2_GROUND[t] = thecube2;
					FLOOR_3_GROUND[t] = thecube3;
					t++;
				}
			}
		}
	}

	// paint the ground
	function paintGround ( material ) {
		for ( var i = 0; i < FLOOR_1_GROUND.length; i++ ) { 
			if ( FLOOR_1_GROUND[i] )  FLOOR_1_GROUND[i].material = material;
			if ( FLOOR_2_GROUND[i] )  FLOOR_2_GROUND[i].material = material;
			if ( FLOOR_3_GROUND[i] )  FLOOR_3_GROUND[i].material = material;
		}
	}
	//-------------------- END OF GROUND FUNCTIONS --------------------//
	
	
	//-------------------- START OF MAZE FUNCTIONS --------------------//
	
	// initialise the maze logically, all three floors have a different randomised maze
	function initLogicalMaze() {
		for ( var c=1 ; c <= NOBOXES ; c++ ) {
			var i = randomintAtoB(1,GRIDSIZE-2);
			var j = randomintAtoB(1,GRIDSIZE-2);
			GRID1[i][j] = GRID_MAZE ;
			
			var m = randomintAtoB(1,GRIDSIZE-2);
			var n = randomintAtoB(1,GRIDSIZE-2);
			GRID2[m][n] = GRID_MAZE ;
			
			var t = randomintAtoB(1,GRIDSIZE-2);
			var u = randomintAtoB(1,GRIDSIZE-2);
			GRID3[t][u] = GRID_MAZE ;
		}
	}

	// initialise the maze in terms of Three.js, need separate for loops to ensure that all maze objects on all floors can be recognised and painted etc.
	function initThreeMaze() {
		var t = 0;
		var u = 0;
		var v = 0;
		for (var i = 0; i < GRIDSIZE ; i++) {
			for (var j = 0; j < GRIDSIZE ; j++) {
				if ( GRID1[i][j] == GRID_MAZE ) {
					var shape    = new THREE.BoxGeometry( SQUARESIZE, SQUARESIZE, SQUARESIZE );			 
					var thecube1  = new THREE.Mesh( shape );
					thecube1.material.color.setHex( BLANKCOLOR  );	
					thecube1.position.x = translate ( i * SQUARESIZE );
					thecube1.position.z = translate ( j * SQUARESIZE );   	
					thecube1.position.y =  0;
					threeworld.scene.add(thecube1);
					FLOOR_1_MAZE[t] = thecube1;
					t++; 
				}
	        }
        }
		for (var m = 0; m < GRIDSIZE ; m++) {
			for (var n = 0; n < GRIDSIZE ; n++) {	   
				if ( GRID2[m][n] == GRID_MAZE ) {
					var shape    = new THREE.BoxGeometry( SQUARESIZE, SQUARESIZE, SQUARESIZE );			 
					var thecube2  = new THREE.Mesh( shape );
					thecube2.material.color.setHex( BLANKCOLOR  );	
					thecube2.position.x = translate ( m * SQUARESIZE );   	
					thecube2.position.z = translate ( n * SQUARESIZE );   	
					thecube2.position.y =  1000;
					threeworld.scene.add(thecube2);
					FLOOR_2_MAZE[u] = thecube2;
					u++; 
				}
			}
        }
		for (var x = 0; x < GRIDSIZE ; x++) {
			for (var y = 0; y < GRIDSIZE ; y++) {	   
				if ( GRID3[x][y] == GRID_MAZE ) {
					var shape    = new THREE.BoxGeometry( SQUARESIZE, SQUARESIZE, SQUARESIZE );			 
					var thecube3  = new THREE.Mesh( shape );
					thecube3.material.color.setHex( BLANKCOLOR  );	
					thecube3.position.x = translate ( x * SQUARESIZE );
					thecube3.position.z = translate ( y * SQUARESIZE );   	
					thecube3.position.y =  2000;
					threeworld.scene.add(thecube3);
					FLOOR_3_MAZE[v] = thecube3;
					v++; 
				}
			}
        }
	}

	// paint the maze
	function paintMaze ( material )	{
		for ( var i = 0; i < FLOOR_1_MAZE.length; i++ ) { 
			if ( FLOOR_1_MAZE[i] )  FLOOR_1_MAZE[i].material = material;
			if ( FLOOR_2_MAZE[i] )  FLOOR_2_MAZE[i].material = material;
			if ( FLOOR_3_MAZE[i] )  FLOOR_3_MAZE[i].material = material;
		}
	}
	//-------------------- END OF MAZE FUNCTIONS --------------------//
	

	//-------------------- START OF AGENT (BUGS BUNNY) FUNCTIONS --------------------//

	// used to draw Bugs Bunny into the world at a certain position
	function drawAgent() {
	    if (theagent) {
    		var x = translate ( ai * SQUARESIZE );   	
    		var z = translate ( aj * SQUARESIZE );   	
    		var y =  agentFloor;
    
    		theagent.position.x = x;
    		theagent.position.y = y;
    		theagent.position.z = z;
            threeworld.lookat.copy ( theagent.position );
	    }
		
	}
	
	// initialise Bugs Bunny logically at a random position
	function initLogicalAgent() {
		var i, j;
		do {
			i = randomintAtoB(1,GRIDSIZE-2);
			j = randomintAtoB(1,GRIDSIZE-2);
		} while ( cannotPlaceObject(i,j) );

		ai = i;
		aj = j;
		currentAgentPosition = [ai,aj];			// remember the position Bugs is currently at
	}
    
	// moves Bugs Bunny around the world and also rotates him to face the direction that he is currently moving in
	function moveLogicalAgent( a ) { 
		var i = ai;
		var j = aj;	
		
		// if moving left, face the correct direction and move
		if ( a == ACTION_LEFT ) { 
		    if(bugsLookingForward) {
		        theagent.rotateY(1 * (Math.PI / 2));
		        bugsLookingLeft = true;
		        bugsLookingForward = false;
		    }
		    else if(bugsLookingBack) {
		        theagent.rotateY(3 * (Math.PI / 2));
		        bugsLookingLeft = true;
		        bugsLookingBack = false;
		    }
		    else if(bugsLookingRight) {
		        theagent.rotateY(2 * (Math.PI / 2));
		        bugsLookingLeft = true;
		        bugsLookingRight = false;
		    }
			i--;
		}
		
		// if moving right, face the correct direction and move
		else if ( a == ACTION_RIGHT ) {
		    if(bugsLookingForward) {
		        theagent.rotateY(3 * (Math.PI / 2));
		        bugsLookingRight = true;
		        bugsLookingForward = false;
		    }
		    else if(bugsLookingBack) {
		        theagent.rotateY(1 * (Math.PI / 2));
		        bugsLookingRight = true;
		        bugsLookingBack = false;
		    }
		    else if(bugsLookingLeft) {
		        theagent.rotateY(2 * (Math.PI / 2));
		        bugsLookingRight = true;
		        bugsLookingLeft = false;
		    }
			i++;
		}
		
		// if moving forward, face the correct direction and move
		else if ( a == ACTION_UP ) {
		    if(bugsLookingRight) {
		        theagent.rotateY(3 * (Math.PI / 2));
		        bugsLookingBack = true;
		        bugsLookingRight = false;
		    }
		    else if(bugsLookingForward) {
		        theagent.rotateY(2 * (Math.PI / 2));
		        bugsLookingBack = true;
		        bugsLookingForward = false;
		    }
		    else if(bugsLookingLeft) {
		        theagent.rotateY(1 * (Math.PI / 2));
		        bugsLookingBack = true;
		        bugsLookingLeft = false;
		    }
		    
			j++;
		}
		
		// if moving backward, face the correct direction and move
		else if ( a == ACTION_DOWN ) {
		    if(bugsLookingRight) {
		        theagent.rotateY(1 * (Math.PI / 2));
		        bugsLookingForward = true;
		        bugsLookingRight = false;
		    }
		    else if(bugsLookingBack) {
		        theagent.rotateY(2 * (Math.PI / 2));
		        bugsLookingForward = true;
		        bugsLookingBack = false;
		    }
		    else if(bugsLookingLeft) {
		        theagent.rotateY(3 * (Math.PI / 2));
		        bugsLookingForward = true;
		        bugsLookingLeft = false;
		    }
			j--;
		}

		if ( ! occupied(i,j) ) { 		// as long as the desired position isn't occupied
			// set new position for Bugs
			ai = i;
			aj = j;
			
			// remember the position
			currentAgentPosition = [ai,aj];
			
			// set the new camera position to follow Bugs
			ci = i;
			cj = j+4;
		}
	}

	// move Bugs Bunny down to the next floor through a burrow, and make Yosemite Sam follow him to the next floor
	function moveAgentDown() {
		if(agentFloor != -50 && canBurrow()) { 			// as long as Bugs is standing on a burrow and isn't on the bottom floor where there is nowhere else to burrow to
			agentFloor -= 1000;
			drawAgent(); 			// draw Bugs on the next floor down
			playBugsBurrowing(); 			// play burrowing sound effect
			moveEnemyDown(); 			// move Yosemite Sam down too
		}
	}
	//-------------------- END OF AGENT (BUGS BUNNY) FUNCTIONS --------------------//


	//-------------------- START OF ENEMY (YOSEMITE SAM) FUNCTIONS --------------------//

	// used to draw Yosemite Sam into the world at a certain position
	function drawEnemy() {
	    if (theenemy) {
    		var x = translate ( ei * SQUARESIZE );   	
    		var z = translate ( ej * SQUARESIZE );   	
    		var y =  enemyFloor;	
    
    		theenemy.position.x = x;
    		theenemy.position.y = y;
    		theenemy.position.z = z;
	    }
		  
	}
	
	//initialise Yosemite Sam logically at a certain position
	function initLogicalEnemy() {
		var i, j;
		do {
			i = randomintAtoB(1,GRIDSIZE-2);
			j = randomintAtoB(1,GRIDSIZE-2);
		} while ( cannotPlaceObject(i,j) );

		ei = i;
		ej = j;
		currentEnemyPosition = [ei,ej];			// remember the position Yosemite is currently at
	}


	//-------------------- START OF A-STAR ALGORITHM PATHFINDING --------------------//
	// credit for A-Star Algorithm:			2d version here:			http://www.briangrinstead.com/blog/astar-search-algorithm-in-javascript
	//										another 2d version here:	http://buildnewgames.com/astar/
	//										this tutorial:				http://www.redblobgames.com/pathfinding/a-star/introduction.html
	//										and this video:				https://www.youtube.com/watch?v=-L-WgKMFuhE
	
	
	function findPath (startingPosition, finishingPosition) {
		var worldSize = GRIDSIZE * GRIDSIZE;	
		
		// Manhattan Distance is the distance between two points measured along axes at right angles, so no diagonal movement allowed
		function manhattanDistance(Point,Goal) {
			return Math.abs(Point.x - Goal.x) + Math.abs(Point.y - Goal.y);		
		}
		
		var distanceFunction = manhattanDistance;
		
		// this function returns an array of every available empty position North, South, East or West of where you are now
		function Neighbours(x,y) {
			var N = y-1;
			var S = y+1;
			var E = x+1;
			var W = x-1;
			myN = N > -1 && !occupied(x,N);
			myS = S < GRIDSIZE && !occupied(x,S);
			myE = E < GRIDSIZE && !occupied(E,y);
			myW = W > -1 && !occupied(W,y);
			result = [];
			if(myN)
				result.push({x:x, y:N});
			if(myE)
				result.push({x:E, y:y});
			if(myS)
				result.push({x:x, y:S});
			if(myW)
				result.push({x:W, y:y});
			
			return result;
		}
		// this function returns a node object that contains possible next routes and their respective costs
		function Node(Parent, Point) {
			var newNode = {			
				Parent:Parent,								// pointer to another Node object			
				value:Point.x + (Point.y * GRIDSIZE),		// array index of this Node			
				x:Point.x,									// the x coordinates of this Node
				y:Point.y,									// the y coordinates of this node			
				f:0,										// f is the cost to get to this Node from Yosemite's current position			
				g:0											// g is the cost to get from this Node to Bugs' curent position
			};

			return newNode;
		}
		
		// this function finds the best path from Yosemite Sam's position to Bugs Bunny's position using the A* Algorithm
		function calculateBestPath() {
			var	pathStart = Node(null, {x:startingPosition[0], y:startingPosition[1]}); // a node from the start coordinates
			var pathEnd = Node(null, {x:finishingPosition[0], y:finishingPosition[1]}); // a node from the end coordinates
					
			var AStar = new Array(worldSize);			// an array that will contain all positions in the world
			var Open = [pathStart];			// a list of currently open nodes
			var Closed = [];			// a list of closed nodes
			var result = []; 			// the array that will be returned
			var myNeighbours;			// a reference to a node that is nearby
			var currentNode;			// a reference to a node that we are now considering taking
			var currentPath;			// a reference to a node that starts the current path we are considering
			
			// temporary variables used in the calculations
			var length, max, min, a, b;
			
			while(length = Open.length) {				// iterate through the open list until there is nothing left		    
				max = worldSize;
				min = -1;
				
				// get the max and min
				for(a = 0; a < length; a++) {
					if(Open[a].f < max) {
						max = Open[a].f;
						min = a;
					}
				}
				
				currentNode = Open.splice(min, 1)[0];			// remove the next node from the open array and put it in currentNode
				
				// is it the destination node?
				if( currentNode.value === pathEnd.value ) {			// if we have reached our destination node (Bugs Bunny's position)
					currentPath = currentNode;
					do {
						result.push([currentPath.x, currentPath.y]);
					} while (currentPath = currentPath.Parent);
					AStar = Closed = Open = [];			// clear the arrays
					result.reverse();			// reverse the result so as not to return a list from finish to start instead of start to finish
				}
				else {			// otherwise, it was not our destination			    
					myNeighbours = Neighbours(currentNode.x, currentNode.y);				// find which nearby nodes are available to move to
					for(a = 0, b = myNeighbours.length; a < b; a++) {				// test each neighbouring node that hasn't been tested already				
						currentPath = Node(currentNode, myNeighbours[a]);				// add to the current path we are considering
						if (!AStar[currentPath.value]) {
							currentPath.g = currentNode.g + distanceFunction(myNeighbours[a], currentNode);			// cost of this current route so far
							currentPath.f = currentPath.g + distanceFunction(myNeighbours[a], pathEnd);			// cost of the current route all the way to the destination (Bugs' position)
							Open.push(currentPath);			// remember this new path by placing it in the open array
							AStar[currentPath.value] = true;			// mark this node as having been visited already so as not to have to check it again
						}
					}
				}
			} // keep iterating while open is not empty
			return result;
		}
		return calculateBestPath();
	}
	//-------------------- END OF A-STAR ALGORITHM PATHFINDING --------------------//

	// moves Yosemite Sam around the world chasing Bugs Bunny according to the A* Pathfinding Algorithm
	// and also rotates him to face the direction that he is currently moving in
    function findBestPathToAgent() {
        var newPathArray = [];
        var i, j;
        newPathArray = (findPath(currentEnemyPosition,currentAgentPosition)); 			// find the best path to Bugs' position and store it in newPathArray
        
		// store the first best possible move to make to reach bugs in the i and j coordinates
		i = newPathArray[1][0];
        j = newPathArray[1][1];
        
		// if moving left, face the correct direction and move
        if ( i < ei && j == ej ) { 
		    if(samLookingForward) {
		        theenemy.rotateY(1 * (Math.PI / 2));
		        samLookingLeft = true;
		        samLookingForward = false;
		    }
		    else if(samLookingBack) {
		        theenemy.rotateY(3 * (Math.PI / 2));
		        samLookingLeft = true;
		        samLookingBack = false;
		    }
		    else if(samLookingRight) {
		        theenemy.rotateY(2 * (Math.PI / 2));
		        samLookingLeft = true;
		        samLookingRight = false;
		    }
		}
		
		// if moving right, face the correct direction and move
		else if ( i > ei && j == ej ) {
		    if(samLookingForward) {
		        theenemy.rotateY(3 * (Math.PI / 2));
		        samLookingRight = true;
		        samLookingForward = false;
		    }
		    else if(samLookingBack) {
		        theenemy.rotateY(1 * (Math.PI / 2));
		        samLookingRight = true;
		        samLookingBack = false;
		    }
		    else if(samLookingLeft) {
		        theenemy.rotateY(2 * (Math.PI / 2));
		        samLookingRight = true;
		        samLookingLeft = false;
		    }
		}
		
		// if moving forward, face the correct direction and move
		else if ( i == ei && j > ej ) {
		    if(samLookingRight) {
		        theenemy.rotateY(3 * (Math.PI / 2));
		        samLookingBack = true;
		        samLookingRight = false;
		    }
		    else if(samLookingForward) {
		        theenemy.rotateY(2 * (Math.PI / 2));
		        samLookingBack = true;
		        samLookingForward = false;
		    }
		    else if(samLookingLeft) {
		        theenemy.rotateY(1 * (Math.PI / 2));
		        samLookingBack = true;
		        samLookingLeft = false;
		    }
		}
		
		// if moving backward, face the correct direction and move
		else if ( i == ei && j < ej ) {
		    if(samLookingRight) {
		        theenemy.rotateY(1 * (Math.PI / 2));
		        samLookingForward = true;
		        samLookingRight = false;
		    }
		    else if(samLookingBack) {
		        theenemy.rotateY(2 * (Math.PI / 2));
		        samLookingForward = true;
		        samLookingBack = false;
		    }
		    else if(samLookingLeft) {
		        theenemy.rotateY(3 * (Math.PI / 2));
		        samLookingForward = true;
		        samLookingLeft = false;
		    }

		}
        
		// set new position for Yosemite Sam
        ei = i;
        ej = j;		
		
        currentEnemyPosition = [ei,ej];			// remember the position
    }

	// move Yosemite Sam down to the next floor	to follow Bugs as long as he isn't already on the bottom floor
	function moveEnemyDown() {
		if(enemyFloor != -50) {
			
			// pick a random position to start off in on the next floor down
		    var i, j;
		    do {
			i = randomintAtoB(1,GRIDSIZE-2);
			j = randomintAtoB(1,GRIDSIZE-2);
		    } while ( cannotPlaceObject(i,j) );  	  // search for empty square 

			// set the new position
	    	ei = i;
		    ej = j;
			
			// remember the position
		    currentEnemyPosition = [ei,ej];
			
			// set the new floor
			enemyFloor -= 1000;
			
			// draw Yosemite Sam in his new position on the next floor
			drawEnemy();
		}
	}
	//-------------------- END OF ENEMY (YOSEMITE SAM) FUNCTIONS --------------------//


	//-------------------- CAMERA FUNCTIONS --------------------//
	
	// draw the camera object that will follow Bugs Bunny
	function drawCamera() {
		var x = translate ( ci * SQUARESIZE );   	
		var z = translate ( cj * SQUARESIZE );   	
		var y =  agentFloor+350;			// set the camera above Bugs Bunny
		
		thecamera.position.x = x;
		thecamera.position.y = y;
		thecamera.position.z = z;
		threeworld.scene.add(thecamera);
        
		threeworld.follow.copy ( thecamera.position );
	}

	// initialise the camera to be 4 steps behind Bugs
    function initLogicalCamera() {    
    		ci = ai;
    		cj = aj+4;
    }
    	
	// initialise the camera in terms of Three.js to avoid errors, basically just make it an invisible box and draw it
	function initThreeCamera() {
		var shape    = new THREE.BoxGeometry( 0, 0, 0 );			 
		thecamera = new THREE.Mesh( shape );
	
		drawCamera();    	    
	}
	
	
	//-------------------- CARROT FUNCTIONS --------------------//
	
	// draw the carrot object on the bottom floor
	function drawCarrot() {
	    if (thecarrot) {
    		var x = translate ( ti * SQUARESIZE );   	
    		var z = translate ( tj * SQUARESIZE );   	
    		var y =  -50;	
    
    		thecarrot.position.x = x;
    		thecarrot.position.y = y;
    		thecarrot.position.z = z;
	    }		  
	}
	
	//initialise the carrot logically in a random position
    function initLogicalCarrot() {
		var i, j;
		do {
			i = randomintAtoB(1,GRIDSIZE-2);
			j = randomintAtoB(1,GRIDSIZE-2);
		} while ( cannotPlaceObject(i,j) );
		
		// set the position of the carrot
		ti = i;
		tj = j;
	}
	
	
	//-------------------- BURROW FUNCTIONS --------------------//
	
	// draw the burrow on the top floor
	function drawTopBurrow() {
	    if (topfloorburrow) {
    		var x = translate ( b1i * SQUARESIZE );   	
    		var z = translate ( b1j * SQUARESIZE );   	
    		var y =  1950;	
    
    		topfloorburrow.position.x = x;
    		topfloorburrow.position.y = y;
    		topfloorburrow.position.z = z;
	    }
    }
    
	// draw the burrow on the middle floor
    function drawMidBurrow() {
	    if (midfloorburrow) {
    		var x = translate ( b2i * SQUARESIZE );   	
    		var z = translate ( b2j * SQUARESIZE );   	
    		var y =  950;	
    
    		midfloorburrow.position.x = x;
    		midfloorburrow.position.y = y;
    		midfloorburrow.position.z = z;
	    }
	}
	
	//initialise the top burrow logically in a random position
    function initLogicalTopBurrow() {
		var i, j;
		do {
			i = randomintAtoB(1,GRIDSIZE-2);
			j = randomintAtoB(1,GRIDSIZE-2);
		} while ( cannotPlaceObject(i,j) );
		
		// set the position of the top burrow
		b1i = i;
		b1j = j;
	}

	//initialise the middle burrow logically in a random position
    function initLogicalMidBurrow() {
		var i, j;
		do {
			i = randomintAtoB(1,GRIDSIZE-2);
			j = randomintAtoB(1,GRIDSIZE-2);
		} while ( cannotPlaceObject(i,j) );
		
		// set the position of the middle burrow
		b2i = i;
		b2j = j;
	}
	

	
	// this function handles user controls to move Bugs around the world
	function keyHandler(e)	{	
		if (e.keyCode == 37)
			moveLogicalAgent ( ACTION_LEFT );
		if (e.keyCode == 38)
			moveLogicalAgent ( ACTION_DOWN );
		if (e.keyCode == 39)
			moveLogicalAgent ( ACTION_RIGHT );
		if (e.keyCode == 40)
			moveLogicalAgent ( ACTION_UP );
		if (e.keyCode == 83)
			moveAgentDown();
	}
	
	
	//-------------------- GENERAL GAME FUNCTIONS, RULES, INTERFACE ETC. --------------------//	

	// checks if Yosemite Sam has caught Bugs
	function bugsCaught() {
		return (ai == ei && aj == ej);		
	}
	// checks if Bugs has reached the carrot
	function reachedCarrot() {
	    return (ai == ti && aj == tj);
	}
	
	// returns the floor that bugs is currently on
	function getBugsFloor() {
	    var printFloor;
		if (agentFloor == 1950) {
		    printFloor = 3;
		}
		else if (agentFloor == 950) {
		    printFloor = 2;
		}
		else {
		    printFloor = 1;
		}
		return printFloor;
	}
	
	// this is called before anyone has moved on this step, agent has just proposed an action
	function updateStatusBefore(a) {
		// show the current step and floor
		var status = " <b> Step:  " + step + " Floor: <b> " + getBugsFloor(); 
		$("#user_span3").html( status );
	}

	// new state after both have moved
	function updateStatusAfter() {
		var status = "..... Click 'Move With' for best gaming experience"; 
		$("#user_span4").html( status );
		var status = "..... Burrow to Floor 1 and Get the Carrot without being Caught to win ..... Press 's' to burrow"; 
		$("#user_span5").html( status );
	}
	
	this.endCondition;			// if set to true the run will end. 

	this.newRun = function() {
		this.endCondition = false;
		step = 0;
        
		// whether graphical run or not, initialise all of these:
		initGrid();
		initUnderside();
		initLogicalWalls(); 
		initLogicalMaze();
		initLogicalAgent();
		initLogicalGround();
		initLogicalEnemy();
		initLogicalCamera();
		initLogicalCarrot();
		initLogicalTopBurrow();
		initLogicalMidBurrow();
		
		// for graphical runs initialise these:
		if ( THREE_RUN  ) {
			threeworld.init3d ( STARTRADIUSCONST, MAXRADIUSCONST, SKYCOLOR  );
            
			// add in ambient light to the world
            var ambient = new THREE.AmbientLight();
    		threeworld.scene.add( ambient );
	   	    var thelight = new THREE.DirectionalLight ( LIGHTCOLOR, 3 );
	  	    thelight.position.set ( STARTRADIUSCONST, STARTRADIUSCONST, STARTRADIUSCONST );
	   	    threeworld.scene.add(thelight);
	   	    
			initSkybox();
			initMusic();
			initThreeWalls(); 
			initThreeMaze();
			initThreeGround();
			initThreeCamera();			
			loadTextures();	

			document.onkeydown = keyHandler;	 
		}
	};

	this.getState = function() {
		var x = [ ai, aj, ei, ej ];
		return ( x );  
	};

	this.takeAction = function ( a ) {
		step++;
		if ( THREE_RUN  )
			updateStatusBefore(a);			// show status line before moves 
		moveLogicalAgent(a);
		if ( ( step % 3 ) == 0 )		// slow the enemy down to every 3rd step the user takes
			findBestPathToAgent();			// chase Bugs

		if ( THREE_RUN  ) {
			
			// draw all of these:
			drawAgent();
			drawEnemy();
			drawCamera();
			drawCarrot();
			drawTopBurrow();
			drawMidBurrow();
			
			updateStatusAfter();			// show status line after moves  
		}

		// if Bugs Bunny has been caught
		if ( bugsCaught() ) {
			this.endCondition = true;
			if ( THREE_RUN  ) {
				musicPause();			// pause the music
				playBugsLoses();			// play soundbite of Bugs being upset
			}
		}
		
		// if Bugs has reached the carrot
		if ( reachedCarrot() ) {
			this.endCondition = true;
			if ( THREE_RUN  ) {
				musicPause();			// pause the music
				playBugsWins();				// play soundbite of Bugs being happy
			}
		}		
	};

	this.endRun = function() {
		if ( THREE_RUN  ) {
			musicPause();		
			if ( this.endCondition ) {
				
				// if Bugs was caught, print this message to the screen:
			    if( bugsCaught() )
				    $("#user_span6").html( "<br>  &nbsp; <font color=red> <B> You've been caught! You Reached floor " + getBugsFloor() + "</B> </font>");
				
				// if Bugs reached the carrot, print this message to the screen:
			    if( reachedCarrot() )
			        $("#user_span6").html( "<br>  &nbsp; <font color=red> <B> You Got The Carrot! You Win! </B> </font>");
			}
			
			// otherwise, the user ran our of steps, so print this message:
			else
				$("#user_span6").html( "<br> &nbsp; <font color=red> <B> You Ran out of steps! . </B> </font>   "  );
		}
	};
}

//-------------------- END OF WORLD CLASS --------------------//

//-------------------- MUSIC AND SOUND EFFECTS --------------------//

// credit:  http://junglevibe23.net/tracks/barber_of_seville.html
function initMusic() {
	// put music element in one of the spans
	var x = "<audio  id=theaudio  src=/uploads/SeanSinnott/barberofseville.mp3   autoplay loop> </audio>" ;
	$("#user_span1").html( x );
} 
 
function musicPlay() {
 	document.getElementById('theaudio').play();
}

function musicPause() {
 	document.getElementById('theaudio').pause();
}

// credit:  http://www.nonstick.com/bugs-bunny-sounds/
function playBugsWins() {
 	var x = "<audio    src=/uploads/SeanSinnott/bugswins.mp3   autoplay  > </audio>";
  	$("#user_span2").html( x );
}

// credit:  http://www.nonstick.com/bugs-bunny-sounds/
function playBugsLoses() {
 	var x = "<audio    src=/uploads/SeanSinnott/bugsloses.mp3   autoplay  > </audio>";
  	$("#user_span2").html( x );
}

// credit:  http://www.sounddogs.com/previews/2213/mp3/349472_SOUNDDOGS__di.mp3
function playBugsBurrowing() {
 	var x = "<audio    src=/uploads/SeanSinnott/burrowing.mp3   autoplay  > </audio>";
  	$("#user_span2").html( x );
}