$(document).ready(function(){
	/**
	 * Console Log
	 */
	var debug = false; // set to false to disable logging for production
	var log = function() {
		if (!debug)
			return false;
		try {
			if (window.console && window.console.firebug || typeof firebug === 'object')
	  			console.log.apply(this, arguments);
	  	} catch(err) {
			alert(err.description+'\nmake sure firebug light\nis included in the header before\nautomator.js');
		}
	}
	log('Starting Error Log...');
	/**
	 * Validation Controller
	 * 
	 * When any item that has validation requirements loses focus and fails validation, a reference to it is placed in the validation queue.
	 * When any item passes validation, the reference is removed. When items exst in the validation queue, transition effects are disabled.
	 * i.e. Actions= Goto= and Consume= all check the validation queue before executing transitions or data transactions
	 * 
	 * @function isnotvalid is called by Actions= and Goto=
	 * To be sure all fields have been checked, we focus and blur all visible items that require validation to trigger the validate function
	 * 
	 * @function hasmissingparts is called by Consume=
	 * Checks all DataRequest items that are required for the consumer, and verifies that they have passed validation.
	 * TODO! Currently, hidden fields can't be validated as they cannot focus or blur.  Need to find a workaround.
	 * 
	 * Written as a plugin to be included externally, but it's location isn't terribly relevant.  Except within this page!
	 * 
	 * @param {Object} vfunction
	 * 
	 */
	$.extend($.fn, {
		validate: function(vfunction) {
			// if validationQueue doesn't exist, create it
			if (typeof validationQueue == 'undefined')
				validationQueue = []; // lack of keyword "var" is intentional.  This makes it global.
			log("This is the element in scope:"+$(this).attr('id'));
			var elementPostion=jQuery.inArray($(this).attr('id'), validationQueue);
			this.add = function(){
				if (elementPostion < 0) { // Check to see if it's already there first
					validationQueue.push($(this).attr('id'));
				}
			}
			//jQuery.inArray($(this).attr('id'), validationQueue);
			this.remove = function() {
				try {
					if (elementPostion >= 0) { // Check to see if it's in there first
						validationQueue.splice(elementPostion, 1);
					}	
				} catch(err) {
					log(err);
					log('Error thrown trying to remove a validation error:'+$(this).attr("id")+' from validation queue.')
				}
			}
			
			// Evaluate passed function, true = add, false = remove
			// Currently we are not executing the function as the caller is passing a value.  Change??
			vfunction ? this.add() : this.remove();
			log(validationQueue);
			return this;
		},
		isnotvalid: function() {
			// activate all visible elements in case required fields were ignored, but not triggered by the blur event
			$(validationSelector+":visible").focus().blur();
			if (typeof validationQueue == 'undefined') {
				return false;
			} else {
				return (validationQueue.length > 1);
			}
		},
		hasmissingparts: function() {
			var stopit = false;
			$("["+datapartTag+"*='"+$(this).attr(consumeTag)+"']").each( function(){
				// if any parts of the dataevent have failed validation, return true
				if (typeof validationQueue != 'undefined' && elementPostion >= 0) {
					stopit = this; // might as well return this as it will validate to true and continue the chain
				}
			});
			return stopit; 
		}
	});
	/**
	 * @author Amit Kasulkar
	 * @refactored Nathan Loyer
	 * Input field validator
	 *
	 * Use to validate input field.
	 * When field loses focus, if field is empty, error message will be displayed.
	 * 
	 * @ validation="not_empty" suggest that the field needs validation
	 * @ validationMsg The error message that you want to display.
	 *
	 * @example
	 * <input type="text"... validation="not_empty">
	 * <input type="text"... validation="alpha-num">
	 * <input type="text"... validation="e-mail">
	 * <input type="text"... validation="zip-us">
	 * 
	 * Source for email filter expression: 
	 * http://xyfer.blogspot.com/2005/01/javascript-regexp-email-validator.html
	 *
	 * Source for zip-filter expression 
	 * http://www.breakingpar.com/bkp/home.nsf/0/87256B280015193F87256F6B005294C2
	*/
	var validationSelector 		= "[validation]";
	var validationTag 			= "validation";
	var validationClass			= "validationclass";
	$(validationSelector).each(function(){
		var errorMessageDiv,errorBoxId,inputVal,errMsg,validationType,isInputInvalid;
		$(this).blur(function(){ 
			var errMsg = this.title, me = $(this);
			var inputVal = me.val();
			if(inputVal == ""){
				me.val(errMsg);
				me.addClass(me.attr(validationClass));
				me.focus(function(){
					if (this.title == me.val()) {
						me.val("");
						me.removeClass(validationClass);
					} 
				});
				me.validate("false");
				return false;
			} else {
				isInputInvalid=_validateInput(me.attr(validationTag),inputVal);
				me.validate(isInputInvalid,inputVal);
				//log('isInputInvalid?-->'+isInputInvalid?);
				if(isInputInvalid) {
					me.val(isInputInvalid);
					me.addClass(validationClass);
					return true;
				}
			}
		});
	});
	/**
	* @Author : Amit K <amit.kasulkar@asurion.com>
	* @refactored Nathan Loyer
	* @param1= Validation Type 
	* @param2= Data to be validate.
	* validate the value against the specified validation type and retuns corr error message
	* Currently supports alpha-num,e-mail,'zip-us'
	*/
	var _validateInput=function(validationType,inputVal)
	{
		var zipFilter = /^\d{5}([\-]\d{4})?$/;
		var emailFilter=/^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i
		var numericFilter=/^\d+$/;  //will validate to nemeric value TEST
		var alphaNumFilter=/^[\d\w]+$/; //test!
		var securityFilter=/^\d{3}$/;
		
		switch(validationType)
		{
			case 'alpha-num':
				errCode=(alphaNumFilter.test(inputVal)) ? '':'Please enter a valid email address';	
				/*for(var jCnt=0; jCnt<inputVal.length; jCnt++)
				{
					var alphaa = inputVal.charAt(jCnt);
					var hh = alphaa.charCodeAt(0);
					errCode=((hh > 47 && hh<58) || (hh > 64 && hh<91) || (hh > 96 && hh<123)) ? error_100:error_101;
				}*/
				break;	
			case 'e-mail':				
				errCode=(emailFilter.test(inputVal)) ? '':'Enter a valid email address';		
				break;
			case 'number':				
				errCode=(numericFilter.test(inputVal)) ? '':'Only numeric characters allowed';		
				break;
			case 'zip-us':
				errCode=(zipFilter.test(inputVal)) ? '':'Enter a valid US zip code';			
				break;
			case 'security_code':
				errCode=(securityFilter.test(inputVal)) ? '':'Enter a valid security code';
				break;
			case 'purchase_date':
				break;
			default:
				errCode='';
			break;
		}
		//log("The Error Message--->"+errCode);
		return errCode;
	}
});