import { useRef, type ChangeEvent } from 'react';
import { FaCamera } from 'react-icons/fa'; // Importing a camera icon (FontAwesome)
import styles from '../UserProfile/userprofile.module.css'

interface PhotoUploadProps {
    file: File | null;
    onChange: (file: File) => void;
    className?: string;
}

const PhotoUpload = ({ file, onChange, className }: PhotoUploadProps) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleIconClick = () => {
        fileInputRef.current?.click(); // Trigger the file input click
    };

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (selected) onChange(selected); // Handle the selected file
    };

    return (
        <div className={`${styles['photo-upload-body']} ${className ?? ''}`}>
            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef} // Assign reference
                style={{ display: 'none' }} // Hide the input
                onChange={handleFileChange}
                name="photo"
            />

            {/* Camera icon that triggers the file input */}
            <button
                type="button"
                onClick={handleIconClick}
                style={{ background: 'none', border: 'none' }}
                className={`${styles['photo-icon']} ${className ?? ''}`}
            >
                <FaCamera size={24} />
            </button>

            {/* Display the selected file (optional) */}
            {file instanceof File ? (
                <p style={{ margin: 0 }} className={`${styles['file-name']} ${className ?? ''}`}>
                    Selected file: {file.name}
                </p>
            ) : (
                <p style={{ margin: 0 }}>No file selected</p>
            )}
        </div>
    );
};

export default PhotoUpload;
