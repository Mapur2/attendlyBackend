from deepface import DeepFace

# Load your two images
img1_path = "https://media.licdn.com/dms/image/v2/D4D03AQG5do9Wxc0otw/profile-displayphoto-shrink_400_400/profile-displayphoto-shrink_400_400/0/1728814292341?e=1759968000&v=beta&t=w7-pZMX5PTgAloeDcHtls_nS2fziojvgTpY0rduZrIY"
img2_path = "https://scontent.fccu10-1.fna.fbcdn.net/v/t39.30808-6/275670117_2802833380020018_2859774388996289941_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=IQpR6pJmeKQQ7kNvwE1lXA7&_nc_oc=AdlXNAUg0sUm9fWIWbuVtMfQhlrMAYA0-DjDnD-O4hOTS3DRMzC--8OpZKDMgwpbeSk&_nc_zt=23&_nc_ht=scontent.fccu10-1.fna&_nc_gid=MIYUXs41gDElANZlLfyCfQ&oh=00_AfZ3I8U7hHMOJFY9IFX99Og2WJIfuv8XzBB1J05vrgX4pw&oe=68BF71E7"

# DeepFace verify
try:
    result = DeepFace.verify(img1_path, img2_path)

    if result["verified"]:
        print(f"✅ MATCH! Similarity: {result}")
    else:
        print(f"❌ NO MATCH! Distance: {result['distance']:.4f}")

except ValueError as e:
    print("Error:", e)
