import { describe, it, expect } from 'vitest';
import { PhonePeExtractor as AdvancedPhonePeExtractor } from '../phonepe';
import { PhonePeExtractor as LocalPhonePeExtractor } from '../bank-extractors';

describe('PhonePe User Case Parser Tests', () => {
    const text = `Transaction Statement for 9000004392
15Jul,2025 - 13Oct,2025
Date Transaction Details Type Amount
Oct 11, 2025 Paid to DEEP GARMENTS DEBIT ₹1,400
05:49 pm Transaction ID T2510111749037008849949
UTR No. 414865555749
Paid by 652902XXXXXXXX10
Oct 11, 2025 Paid to NAMITA SONI DEBIT ₹800
11:11 am Transaction ID T2510111111438855315677
UTR No. 386851915802
Paid by XXXXXX4230
Oct 10, 2025 Paid to AJAY MEDICAL STORE DEBIT ₹370
05:25 pm Transaction ID T2510101725109842240896
UTR No. 282290909340
Paid by XXXXXX6703
Oct 09, 2025 Paid to VIJAY SHARMA DEBIT ₹20
01:59 pm Transaction ID T2510091359104671715075
UTR No. 938675383557
Paid by XXXXXX6703
Oct 06, 2025 Paid to Nikhil DEBIT ₹2,518
08:53 pm Transaction ID T2510062053470197997825
UTR No. 328983647303
Paid by XXXXXX4230
Oct 06, 2025 Paid to BRAR FILLING STATION DEBIT ₹1,530
04:32 pm Transaction ID T2510061632266676153000
UTR No. 349461168755
Paid by 652902XXXXXXXX10
Oct 04, 2025 Paid to Ms harbans lal &sons DEBIT ₹60
07:42 pm Transaction ID T2510041942223290269640
UTR No. 016796801505
Paid by 652902XXXXXXXX10
Page 1 of 11
This is a system generated statement. For any queries, contact us athttps://support.phonepe.com/statement.

Date Transaction Details Type Amount
Oct 04, 2025 Paid to VISHAL VOHRA DEBIT ₹260
06:12 pm Transaction ID T2510041811564902869920
UTR No. 292235128432
Paid by XXXXXX4230
Oct 04, 2025 Paid to Ms harbans lal &sons DEBIT ₹10
06:10 pm Transaction ID T2510041810189994786952
UTR No. 102788926775
Paid by 652902XXXXXXXX10
Oct 04, 2025 Paid to AJAY MEDICAL STORE DEBIT ₹350
04:30 pm Transaction ID T2510041630524908568856
UTR No. 754068008859
Paid by XXXXXX6703
Oct 03, 2025 Paid to NARENDER PAUL DEBIT ₹280
07:13 pm Transaction ID T2510031913275668253331
UTR No. 958447808857
Paid by XXXXXX4230
Sept 30, 2025 Paid to Vikas Jat DEBIT ₹100
12:18 am Transaction ID T2509300018049773639304
UTR No. 519313504327
Paid by XXXXXX6703
Sept 27, 2025 Paid to SMT MONIKA OHRI W O MUNISH OHRI DEBIT ₹2,400
04:32 pm Transaction ID T2509271632466569020238
UTR No. 068507579682
Paid by XXXXXX4230
Sept 27, 2025 Received from Synapsis Medical Technologies Inc CREDIT ₹15,644.95
06:44 am Transaction ID T2509270644485997967932
UTR No. 527002983980
Credited to XXXXXX4230
Sept 26, 2025 Paid to SHIV RAM DEBIT ₹20
09:06 am Transaction ID T2509260906461579712547
UTR No. 661545103515
Paid by XXXXXX6703
Page 2 of 11
This is a system generated statement. For any queries, contact us athttps://support.phonepe.com/statement.

Date Transaction Details Type Amount
Sept 25, 2025 Received from Synapsis Medical Technologies Inc CREDIT ₹15,704.74
06:18 pm Transaction ID T2509251818033522418659
UTR No. 526898531664
Credited to XXXXXX4230
Sept 25, 2025 Paid to BRAR FILLING STATION DEBIT ₹1,520
10:45 am Transaction ID T2509251045542344421969
UTR No. 885018327912
Paid by 652902XXXXXXXX10
Sept 21, 2025 Paid to Bajrang chaat bhandar DEBIT ₹20
08:40 pm Transaction ID T2509212040471811212657
UTR No. 369942229405
Paid by 652902XXXXXXXX10
Sept 21, 2025 Paid to DILBAGH SINGH RANA DEBIT ₹130
07:39 pm Transaction ID T2509211939047113312591
UTR No. 356022302253
Paid by 652902XXXXXXXX10
Sept 18, 2025 Payment to Google Play DEBIT ₹470
11:48 pm Transaction ID OLEX2509182348354433269249
UTR No. 924640722615
Paid by XXXXXX6703
Sept 18, 2025 Paid to HEERA ENTERPRISES DEBIT ₹25
08:11 pm Transaction ID T2509182011476012062195
UTR No. 090682679940
Paid by 652902XXXXXXXX10
Sept 13, 2025 Paid to Nikhil DEBIT ₹10,000
08:11 pm Transaction ID T2509132011355912000162
UTR No. 697283298182
Paid by XXXXXX4230
Sept 11, 2025 Paid to Rahul Filling Station DEBIT ₹1,020
09:20 pm Transaction ID T2509112120208318738031
UTR No. 514669990368
Paid by 652902XXXXXXXX10
Page 3 of 11
This is a system generated statement. For any queries, contact us athttps://support.phonepe.com/statement.

Date Transaction Details Type Amount
Sept 10, 2025 Paid to BANGANA FILLING STATION DEBIT ₹1,550
02:28 pm Transaction ID T2509101428082738526909
UTR No. 039122117095
Paid by 652902XXXXXXXX10
Sept 10, 2025 Paid to NAMITA SONI DEBIT ₹800
12:25 am Transaction ID T2509100025183670526799
UTR No. 937669292756
Paid by XXXXXX4230
Sept 08, 2025 Paid to MYJIO DEBIT ₹899
01:43 pm Transaction ID T2509081343133005579790
UTR No. 443435230419
Paid by 652902XXXXXXXX10
Sept 05, 2025 Paid to Davinder DEBIT ₹15,000
05:17 pm Transaction ID T2509051716552041516184
UTR No. 473955148519
Paid by XXXXXX4230
Sept 05, 2025 Paid to DEEP GARMENTS DEBIT ₹1,500
04:19 pm Transaction ID T2509051619258854158554
UTR No. 500038894676
Paid by 652902XXXXXXXX10
Sept 04, 2025 Mobile recharged 9915344792 DEBIT ₹223.70
01:34 pm Transaction ID NX25090413340890307940001
UTR No. 306110912490
Airtel Prepaid Reference ID 948516891
Paid by 652902XXXXXXXX10
Sept 02, 2025 Paid to Neelkanth CSC DEBIT ₹100
11:37 am Transaction ID T2509021137041032866599
UTR No. 929815520224
Paid by 652902XXXXXXXX10
Page 4 of 11
This is a system generated statement. For any queries, contact us athttps://support.phonepe.com/statement.

Date Transaction Details Type Amount
Sept 01, 2025 Mobile recharged 8988707962 DEBIT ₹150.14
05:17 pm Transaction ID NX25090117172235910799811
UTR No. 139475198053
BSNL Prepaid Reference ID 7356562668
Paid by 652902XXXXXXXX10
Aug 27, 2025 Paid to MANOJ KUMAR DEBIT ₹500
05:51 pm Transaction ID T2508271751404530667017
UTR No. 243099639698
Paid by XXXXXX4230
Aug 26, 2025 Paid to DR Mac DEBIT ₹7,500
07:39 pm Transaction ID T2508261939255175341142
UTR No. 139522349567
Paid by 652902XXXXXXXX10
Aug 26, 2025 Paid to ARUN KUMAR DEBIT ₹115
06:09 pm Transaction ID T2508261808556884960195
UTR No. 784192677346
Paid by XXXXXX6703
Aug 25, 2025 Paid to ANU RADHA GENERAL STORE DEBIT ₹100
11:00 am Transaction ID T2508251100402633587148
UTR No. 691015135552
Paid by 652902XXXXXXXX10
Aug 23, 2025 Paid to NIKHIL KALIA DEBIT ₹45
11:18 am Transaction ID T2508231118222998387351
UTR No. 320464775567
Paid by 652902XXXXXXXX10
Aug 23, 2025 Paid to SUSHIL KUMAR DEBIT ₹1,700
09:43 am Transaction ID T2508230943363387093588
UTR No. 888330280042
Paid by XXXXXX6703
Page 5 of 11
This is a system generated statement. For any queries, contact us athttps://support.phonepe.com/statement.

Date Transaction Details Type Amount
Aug 21, 2025 Paid to Heera Enterprises DEBIT ₹350
07:37 pm Transaction ID T2508211937263102702138
UTR No. 614146075366
Paid by 652902XXXXXXXX10
Aug 18, 2025 Payment to Google Play DEBIT ₹470
11:48 pm Transaction ID OLEX2508182348288299303061
UTR No. 260301522305
Paid by XXXXXX6703
Aug 16, 2025 Paid to SBIMOPS DEBIT ₹50
11:12 pm Transaction ID T2508162312283691664351
UTR No. 974730771000
Paid by XXXXXX4230
Aug 15, 2025 Paid to Ms harbans lal &sons DEBIT ₹30
08:23 pm Transaction ID T2508152023388872173560
UTR No. 462246178636
Paid by 652902XXXXXXXX10
Aug 15, 2025 Paid to Coconet water DEBIT ₹280
06:46 pm Transaction ID T2508151846356057473160
UTR No. 816244840512
Paid by 652902XXXXXXXX10
Aug 14, 2025 Paid to Sis DEBIT ₹5,000
02:09 pm Transaction ID T2508141409487980808125
UTR No. 672126684242
Paid by XXXXXX4230
Aug 12, 2025 Received from Synapsis Medical Technologies Inc CREDIT ₹15,636.17
06:07 pm Transaction ID T2508121807501094709631
UTR No. 522471834545
Credited to XXXXXX4230
Aug 10, 2025 Paid to GOPAL SWEETS PVT LTD DEBIT ₹404
04:32 pm Transaction ID T2508101632021237135689
UTR No. 199748121368
Paid by 652902XXXXXXXX10
Page 6 of 11
This is a system generated statement. For any queries, contact us athttps://support.phonepe.com/statement.

Date Transaction Details Type Amount
Aug 10, 2025 Paid to DEBIT ₹30
02:13 pm CHANDIGARH INDUSTRIAL TOURISM DEV CORPN LTD
Transaction ID T2508101413495166817434
UTR No. 739509229320
Paid by 652902XXXXXXXX10
Aug 10, 2025 Paid to VISHAL MEGA MART DEBIT ₹1,834
12:59 pm Transaction ID T2508101259313999565064
UTR No. 314234284326
Paid by 652902XXXXXXXX10
Aug 10, 2025 Paid to Sis DEBIT ₹1,100
11:03 am Transaction ID T2508101103374077873065
UTR No. 190266088246
Paid by XXXXXX4230
Aug 10, 2025 Paid to Kriti Sis DEBIT ₹501
10:45 am Transaction ID T2508101045163305414330
UTR No. 840536586823
Paid by XXXXXX4230
Aug 09, 2025 Paid to BALJEET SINGH DEBIT ₹228
01:31 pm Transaction ID T2508091331232556303249
UTR No. 268015568491
Paid by XXXXXX4230
Aug 09, 2025 Paid to SULKHAN SINGH DEBIT ₹40
11:09 am Transaction ID T2508091109227350041845
UTR No. 232819029592
Paid by XXXXXX4230
Aug 08, 2025 Paid to DINESH KUMAR DEBIT ₹200
02:21 pm Transaction ID T2508081421011581707564
UTR No. 248156390964
Paid by XXXXXX4230
Page 7 of 11
This is a system generated statement. For any queries, contact us athttps://support.phonepe.com/statement.

Date Transaction Details Type Amount
Aug 08, 2025 Paid to NAMITA SONI DEBIT ₹800
02:15 pm Transaction ID T2508081415132966405536
UTR No. 661707928378
Paid by XXXXXX4230
Aug 07, 2025 Paid to PANKAJ KUMAR DEBIT ₹200
01:41 pm Transaction ID T2508071341357648257724
UTR No. 212444032670
Paid by XXXXXX4230
Aug 07, 2025 Paid to CITY HEART SUPERSPECIALITY HOSPITAL DEBIT ₹3,208
01:07 pm Transaction ID T2508071306571279992804
UTR No. 696596933827
Paid by 652902XXXXXXXX10
Aug 07, 2025 Paid to CITY HEART SUPERSPECIALITY HOSPITAL DEBIT ₹2,500
12:20 pm Transaction ID T2508071220401874347884
UTR No. 474882131854
Paid by 652902XXXXXXXX10
Aug 06, 2025 Paid to BRAR FILLING STATION DEBIT ₹1,550
06:24 pm Transaction ID T2508061824433271211466
UTR No. 380497624553
Paid by 652902XXXXXXXX10
Aug 06, 2025 Paid to BALA KUMARI DEBIT ₹200
02:08 pm Transaction ID T2508061408068519181342
UTR No. 969218851271
Paid by XXXXXX4230
Aug 06, 2025 Paid to RAJAT KUMAR DEBIT ₹1,000
12:04 pm Transaction ID T2508061204085690221967
UTR No. 060563703923
Paid by XXXXXX4230
Aug 02, 2025 Paid to DINESH KUMAR DEBIT ₹700
12:22 pm Transaction ID T2508021222353680926992
UTR No. 664455473718
Paid by XXXXXX4230
Page 8 of 11
This is a system generated statement. For any queries, contact us athttps://support.phonepe.com/statement.

Date Transaction Details Type Amount
Aug 02, 2025 Paid to NIKHIL KALIA DEBIT ₹80
10:21 am Transaction ID T2508021021103651733538
UTR No. 430804664397
Paid by 652902XXXXXXXX10
Aug 01, 2025 Paid to POLICYBAZAAR INSURANCE BROKERS DEBIT ₹871
08:08 pm Transaction ID T2508012008521202572505
UTR No. 035914184674
Paid by 652902XXXXXXXX10
Jul 28, 2025 Paid to DINESH KUMAR DEBIT ₹20
07:52 pm Transaction ID T2507281952071227756428
UTR No. 600480672342
Paid by XXXXXX6703
Jul 28, 2025 Paid to JEET AUTOMOBILE AGENCY DEBIT ₹330
05:12 pm Transaction ID T2507281711586701582348
UTR No. 039098315656
Paid by 652902XXXXXXXX10
Jul 27, 2025 Paid to Rahul filling station DEBIT ₹1,530
08:56 pm Transaction ID T2507272056006489723678
UTR No. 578367263083
Paid by 652902XXXXXXXX10
Jul 27, 2025 Paid to SANJAY KUMAR DEBIT ₹480
01:09 pm Transaction ID T2507271309494489821073
UTR No. 816459506477
Paid by 652902XXXXXXXX10
Jul 27, 2025 Paid to Suraj Sweets 4 DEBIT ₹420
12:10 pm Transaction ID T2507271210256162189105
UTR No. 577682563426
Paid by 652902XXXXXXXX10
Jul 24, 2025 Paid to DINESH KUMAR DEBIT ₹150
11:58 am Transaction ID T2507241158007194570631
UTR No. 602017744736
Paid by XXXXXX4230
Page 9 of 11
This is a system generated statement. For any queries, contact us athttps://support.phonepe.com/statement.

Date Transaction Details Type Amount
Jul 23, 2025 Paid to DINESH KUMAR DEBIT ₹3
02:33 pm Transaction ID T2507231433515308390499
UTR No. 978361505765
Paid by XXXXXX4230
Jul 22, 2025 Paid to DINESH KUMAR DEBIT ₹100
02:24 pm Transaction ID T2507221424143084710536
UTR No. 492029825077
Paid by XXXXXX4230
Jul 22, 2025 Paid to MANOJ KUMAR DEBIT ₹500
01:09 pm Transaction ID T2507221309482208656362
UTR No. 722447266152
Paid by XXXXXX4230
Jul 21, 2025 Paid to Amar sinhh koundal DEBIT ₹300
06:51 pm Transaction ID T2507211851324103372799
UTR No. 716626132055
Paid by 652902XXXXXXXX10
Jul 21, 2025 Paid to Amar sinhh koundal DEBIT ₹400
06:43 pm Transaction ID T2507211843278411379615
UTR No. 248729253685
Paid by 652902XXXXXXXX10
Jul 21, 2025 Paid to PARDEEP KUMAR DEBIT ₹200
06:23 pm Transaction ID T2507211823502153393605
UTR No. 292270156422
Paid by 652902XXXXXXXX10
Jul 21, 2025 Paid to Friends Bakery DEBIT ₹400
06:18 pm Transaction ID T2507211818309945322496
UTR No. 030614656403
Paid by 652902XXXXXXXX10
Jul 21, 2025 Received from Krishn Pal CREDIT ₹700
06:06 pm Transaction ID T2507211806358408005971
UTR No. 520243361739
Credited to XXXXXX4230
Page 10 of 11
This is a system generated statement. For any queries, contact us athttps://support.phonepe.com/statement.

Date Transaction Details Type Amount
Jul 20, 2025 Paid to SAPNA ENTERPRISES DEBIT ₹180
07:53 pm Transaction ID T2507201953212082154756
UTR No. 585186535386
Paid by 652902XXXXXXXX10
Jul 19, 2025 Paid to Rahul Filling Station DEBIT ₹1,550
06:37 pm Transaction ID T2507191837197069686405
UTR No. 262948500308
Paid by 652902XXXXXXXX10
Jul 18, 2025 Payment to Google Play DEBIT ₹470
11:48 pm Transaction ID OLEX2507182348266297077749
UTR No. 806275111995
Paid by XXXXXX6703
Page 11 of 11
This is an automatically generated statement. Customer(s) are requested to immediately notify PhonePe in case
of any errors in the statement at https://support.phonepe.com/statement and visit https://www.phonepe.com/
terms-conditions/ for PhonePe Terms & Conditions and Privacy Policy.
Disclaimer : Do not fall prey to fictitious offers of winning prizes, money circulation schemes and cheap funds,
etc. through SMS, emails and calls. The contents of this email and document are confidential and intended for
the recipient specified in this document. If you received this message by mistake, please inform PhonePe at
https://support.phonepe.com/statement so that we can ensure the recipient's details are corrected.`;

    it('should parse the user statement text successfully with Advanced PhonePe Extractor', () => {
        expect(AdvancedPhonePeExtractor.identify(text)).toBe(true);
        const transactions = AdvancedPhonePeExtractor.extract(text);
        expect(transactions.length).toBeGreaterThan(0);
    });

    it('should parse the user statement text successfully with Local PhonePe Extractor', () => {
        expect(LocalPhonePeExtractor.identify(text)).toBe(true);
        const transactions = LocalPhonePeExtractor.extract(text);
        expect(transactions.length).toBeGreaterThan(0);
    });
});
