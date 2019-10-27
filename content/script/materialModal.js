var loadMaterialModalPromise = (conatainer) => {
    
    return new Promise((resolve, reject) => {
        try{
            $(conatainer).load("/content/layout/materialModal.html", () => {
                resolve();
            })
        } catch (e){
            reject();
        }
    });
}

var engageProgress = (params={}) => {
    
    /*Init*/
    $('.bottom-sheet').modal({
        dismissible: false
    });

    /*Stage*/
    $(".bottom-sheet .modal-content h4").css({"visibility": "hidden"});
    $(".bottom-sheet .modal-footer").css({"visibility": "hidden"});
    $(".dialogMsg").css({"display": "none"});
    $(".bottom-sheet .modal-content table").css({"display": "table"});

    /*Set Msg*/
    $(".progressMsg").text(params.msg==null?"Requesting": params.msg);

    /*Show*/    
    $(".bottom-sheet").modal('open');

    if (params.callback!=null || params.callback!=undefined){
        setTimeout( () => {
            params.callback();
        }, params.timeout);
    }
}

var engageDialog = (params={}) => {
    
    /*Init*/
    $('.bottom-sheet').modal({
        dismissible: true
    });

    /*Stage*/
    $(".bottom-sheet .modal-content h4").css({"visibility": "visible"});
    $(".bottom-sheet .modal-footer").css({"visibility": "visible"});
    $(".dialogMsg").css({"display": "block"});
    $(".bottom-sheet .modal-content table").css({"display": "none"});
    $(".dialogPositiveButton").css({"visibility": "visible"});
    $(".dialogNegativeButton").css({"visibility": "visible"});

    /*Set Content*/
    $(".bottom-sheet .modal-content h4").html(params.head==null?"Head": params.head);
    $(".dialogMsg").html(params.body==null?"Body": params.body);    

    /*Handle Callbacks*/
    if (params.negativeCallback==null && params.positiveCallback==null){        
        $(".dialogPositiveButton").css({"visibility": "hidden"});
        $(".dialogNegativeButton").css({"visibility": "hidden"});
    } else {
        $(".dialogPositiveButton").text(params.positiveText);
        $(".dialogNegativeButton").text(params.negativeText);
        $(".dialogPositiveButton").click(() => {
            params.positiveCallback();
        });
        if (params.negativeCallback != null){
            $(".dialogNegativeButton").removeClass("modal-close");
            $(".dialogNegativeButton").click(() => {            
                params.negativeCallback();
            });
        }
        
    }

    /*Show*/    
    $(".bottom-sheet").modal('open');

}

var dismissDialog = () => {
    $(".bottom-sheet").modal('close');
}


