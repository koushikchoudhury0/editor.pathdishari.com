var selectedPackageId, selectedPackageName;
var slideInputs = ["slide1", "slide2", "slide3", "slide4"];
var updatableSlides = {
    "slide1": false,
    "slide2": false,
    "slide3": false,
    "slide4": false,
}

class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = "ValidationError";
    }
}

$(document).ready(() => {
    $("header").load("/content/layout/navbar.html", () => {        
        $("ul.tabs li:eq(3) a").addClass("active");
        $("main").css({"margin-top": $("header").height()});
        /*$(".slide-out-top").prepend('\
            <div class="row" style="margin: 0; padding: 0; margin: 0">\
                <div class="col s12 sectorSelectContainer">\
                    <select id="sectorList">\
                        <option disabled selected>Choose Sector</option>\
                    </select>\
                </div>\
            </div>\
        ');*/
        $("#sectorList").on("change", () => {
            $("#sectorList").formSelect();
            //fetchAllExams($("#sectorList").formSelect('getSelectedValues')[0]);
            console.log($("#sectorList").formSelect('getSelectedValues')[0]);
            $("#sectorPreview").text($("#sectorList").formSelect('getSelectedValues')[0]);
            $("#fab").css({"visibility": "visible"});
        });        
        loadMaterialModalPromise(".modalContainer").then(()=>{    
            M.AutoInit();            
            $('.characterCountable').characterCounter();
            $(".sidenavHeader").html("Categories<i style=\"margin-right: 10px\" class='material-icons'>dashboard</i>"); 
            $("ul.sidenav").append(getSidenavElementBody("Slideshow", "openSlideShow"));
            $("ul.sidenav").append(getSidenavElementBody("Popular Packages", "openSlideShow"));
            //enlistPackages();   
            //fetchAllExams();  
            //fetchSectors();     
        }); 
        //$('.sidenav').sidenav(); 
        var clipboard = new ClipboardJS('#copier');      
        clipboard.on('success', function(e) {
            M.toast({html: "Exam ID Copied"});
            e.clearSelection();
        });
    });
    
});

var chooseImage = (elem) => {
    $(elem).parent().children("input").trigger("click");
}

var readImageFromDisk = (input, target = $(input).parent().children("img")) => {
    console.log("reading from disk to ", $(input).attr("id"));
    updatableSlides[$(input).attr("id")] = true;
    console.log(updatableSlides);
    if (input.files && input.files[0]) {
        var reader = new FileReader();        
        reader.onload = function(e) {            
            $(target).attr('src', e.target.result);
        }        
        reader.readAsDataURL(input.files[0]);
    }
}

var getSidenavElementBody = (category, functionName) => {
    return '\
    <li>\
        <div onclick="'+functionName+'()" class="waves-effect sidenavElement">\
            <a class="examAbbreviation">'+category+'</a>\
        </div>\
        <li><div style="margin-top: 0" class="divider"></div></li>\
    </li>\
    ';
}

var openSlideShow = () => {
    console.log("hey");
}

var updateSlideShow = () => {
    //Request Signed URLs    
    var updateArr = [];
    var truthFound = false;
    slideInputs.forEach((v, i) => {
        updateArr.push(updatableSlides[v])
        if (updatableSlides[v] == true) truthFound = true;
    });    
    if (truthFound == false){
        M.toast({html: "No changes to update"});
        return;
    }
    engageProgress({
        msg: "Requesting access to slides..."
    });
    $.ajax({
        url: "https://33qo10kq34.execute-api.ap-south-1.amazonaws.com/prod/admin-update-dashboard-slide",
        type: "POST",
        headers: {
            "Authorization": Cookies.get("token")
        },
        data: JSON.stringify({
            updateArr: updateArr
        }),
        contentType: "application/json"        
    }).done((responseBody => {
        dismissDialog();
        if (responseBody.statusCode == 1){
            M.toast({html: "Uploading Slides..."});
            console.log(responseBody.signedArr);
            for (var i=0; i<responseBody.signedArr.length; i++){
                if (responseBody.signedArr[i] != ""){                
                    uploadSlide(i, responseBody.signedArr[i]);
                }
            }
            /*slideInputs.forEach((v, i) => {
                updatableSlides[v] = false;
                console.log(updatableSlides);                
            });*/
        } else {
            engageDialog({
                head: "Cannot update slides",
                body: "Something went wrong."
            });
        }
    })).fail((xhr) => {
        console.log("failed: ", xhr.status);
        dismissDialog();
        if (xhr.status === 403 || xhr.status === 401){
            Cookies.remove("token");
            window.location.replace("/");
        } else {
            engageDialog({
                head: "Cannot update slides",
                body: "Something went wrong."
            });
        }
    })
    /*$.ajax({
        url: "https://s3.ap-south-1.amazonaws.com/pathdishari.com/dashboardContent/0?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=ASIATWSCJVXHBVIX2M6K%2F20191016%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20191016T164343Z&X-Amz-Expires=7200&X-Amz-Security-Token=AgoJb3JpZ2luX2VjEGkaCmFwLXNvdXRoLTEiRjBEAiAwObQJbmu6%2BilNQd6yNJEmAgumbGoa9nv%2BNP34F98UtQIgalLKvc%2FLfzjm32yKViujYYlaGbSTiQZgpJtSrOs9MD4qmAIIYhAAGgwyNTQ2MTU4NTg2MzgiDD7a57OBoNI9%2BylgHir1AeZZQz5HeBou99rFKjkYCDteHk1R6yQiZY%2B32auBmHxLb%2BoDaE9pNvs6yET0HDDhHwDN9pT4457InRk%2B7ZSCojJpfSOw3jrqonR1MR20eu2AYbIM6l1reO6zSoQGeNBPB36hkQnesZMDVWQc3g3hJ5%2BWVauioj%2B06cpS7iNkoV1hazzyYiEbQuWzFk0DtZ%2F3xnGi87gA%2FoOkRsbdCP32imD6RnCjOTAIOA%2FP9o7LAWYp47Y%2FdLENIFvAXSQgfLXFCEjTzOClEgX8xpANtDzccizbaicz2tva2i%2Fl5hHDeKW7CLRMsF3WPHTkk17bFW6oFB0bzc30MPGMne0FOrUBgtUHPqOiv61FHHfXQDA12VCZPWUbNjBcQ4IBJzX1V6N3waEOAvrjM55L5QubuLjlB2uqWWp%2FhHCRJfFCiydz6Y1TpyrdjNrdRFjLyuwgl%2Bos9xyQo%2BsZqwxJ5K0o7ZpBl%2F2b9G42PYo9qXKTgSBrKKEAoak3njuAnXKZnTGACUvt5Qt7fbLZs01kyWvjjhhpj6mpv2H6NY6fWj%2B71zqe1I4zTOp954U1MowmnQWh98lWOUdn5w%3D%3D&X-Amz-Signature=a874666702b13e690fceea96acef54069c1c5b98310e5cf4492415f5bb2ed18c&X-Amz-SignedHeaders=host",
        type: 'PUT',
        data: $('input#slide1')[0].files[0],
        contentType: $('input#slide1')[0].files[0].type,
        processData: false,
        cache: false,
        error: function (data) { 
            console.log("failed");
        },
        success: function (response) {
            console.log("done")
        }
    });*/
}

var uploadSlide = (i, signedURL) => {
    $.ajax({
        url: signedURL,
        type: 'PUT',
        data: $('input#slide'+(i+1))[0].files[0],
        contentType: $('input#slide'+(i+1))[0].files[0].type,
        processData: false,
        cache: false,
        error: function (data) {      
            M.toast({html: "Slide "+(i+1)+" Update Failed"});                   
        },
        success: function (response) {            
            M.toast({html: "Slide "+(i+1)+" Uploaded!"});
            updatableSlides["slide"+(i+1)] = false;
            console.log("Neutralized slide"+(i+1), updatableSlides);
        }
    });
}
